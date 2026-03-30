import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { writeOwnerAudit } from '@/lib/server/audit-log';
import { provisionManagedUser } from '@/lib/server/user-provisioning';

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(300).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  let reviewer;
  try {
    reviewer = await requireAuthorizedUser(request, ['owner']);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }

  const routeParams = await params;
  const json = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review payload.' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const reviewTimestamp = new Date().toISOString();
  const { data: claimedRecord, error: claimError } = await admin
    .from('requests')
    .update({
      reviewed_by: reviewer.profile.id,
      reviewed_at: reviewTimestamp,
      review_note: parsed.data.reviewNote || null
    })
    .eq('id', routeParams.id)
    .eq('status', 'pending')
    .is('reviewed_by', null)
    .select('id, type, status, data, created_by')
    .maybeSingle();

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  if (!claimedRecord) {
    return NextResponse.json({ error: 'This request has already been reviewed.' }, { status: 409 });
  }

  const record = claimedRecord;

  const releaseClaim = async () => {
    await admin
      .from('requests')
      .update({
        reviewed_by: null,
        reviewed_at: null,
        review_note: null
      })
      .eq('id', routeParams.id)
      .eq('status', 'pending')
      .eq('reviewed_by', reviewer.profile.id);
  };

  if (parsed.data.status === 'rejected') {
    const { error: rejectError } = await admin
      .from('requests')
      .update({
        status: 'rejected',
        review_note: parsed.data.reviewNote || null
      })
      .eq('id', routeParams.id)
      .eq('status', 'pending')
      .eq('reviewed_by', reviewer.profile.id);

    if (rejectError) {
      await releaseClaim();
      return NextResponse.json({ error: rejectError.message }, { status: 500 });
    }

    try {
      await writeOwnerAudit('request_rejected', {
        actorUserId: reviewer.profile.id,
        entityType: 'request',
        entityId: record.id,
        details: {
          type: record.type,
          reviewNote: parsed.data.reviewNote || null
        }
      });
    } catch {
      // Rejection should not fail after the request state was already updated.
    }

    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  if (record.type === 'workout-plan') {
    const payloadAny = record.data as Record<string, unknown>;
    const memberId = Number(payloadAny.memberId || 0);
    const workoutPlan = payloadAny.workoutPlan || null;
    const { error: workoutError } = await admin
      .from('members')
      .update({ workout_plan: workoutPlan })
      .eq('id', memberId);

    if (workoutError) {
      await releaseClaim();
      return NextResponse.json({ error: workoutError.message }, { status: 500 });
    }
  }

  if (record.type === 'trainer-attendance') {
    const creatorId = record.created_by;
    if (!creatorId) {
      await releaseClaim();
      return NextResponse.json({ error: 'Trainer attendance request is missing creator.' }, { status: 400 });
    }

    const { data: trainer } = await admin
      .from('trainers')
      .select('id')
      .eq('user_id', creatorId)
      .single();

    if (!trainer) {
      await releaseClaim();
      return NextResponse.json({ error: 'Trainer profile not found.' }, { status: 404 });
    }

    const requestPayload = record.data as Record<string, unknown>;
    const { error: attendanceError } = await admin
      .from('trainer_attendance')
      .upsert({
        trainer_id: trainer.id,
        date: String(requestPayload.date || new Date().toISOString().slice(0, 10))
      }, { onConflict: 'trainer_id,date' });

    if (attendanceError) {
      await releaseClaim();
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }
  }

  let createdUserId: string | null = null;
  let createdEntityId: string | number | null = null;
  let rollbackCreatedUser: (() => Promise<void>) | null = null;
  if (record.type === 'client' || record.type === 'member' || record.type === 'trainer') {
    const payload = record.data as Record<string, string | undefined>;
    try {
      const createdUser = await provisionManagedUser({
        role: record.type === 'trainer' ? 'trainer' : 'client',
        fullName: String(payload.fullName || ''),
        phone: String(payload.phone || ''),
        email: String(payload.email || ''),
        governmentId: String(payload.governmentId || ''),
        profilePhotoUrl: String(payload.profilePhotoUrl || ''),
        planPreference: payload.planPreference
      });

      createdUserId = createdUser.userId;
      createdEntityId = createdUser.memberId || createdUser.trainerId || createdUser.userId;
      rollbackCreatedUser = createdUser.rollback;
    } catch (error) {
      await releaseClaim();
      const message = error instanceof Error ? error.message : 'Could not provision the requested account.';
      return NextResponse.json({ error: message }, { status: /already exists/i.test(message) ? 409 : 500 });
    }
  }

  const { error: requestError } = await admin
    .from('requests')
    .update({
      status: 'approved',
      review_note: parsed.data.reviewNote || null,
      reviewed_by: reviewer.profile.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', routeParams.id);

  if (requestError) {
    if (rollbackCreatedUser) {
      try {
        await rollbackCreatedUser();
      } catch (rollbackError) {
        const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : 'Rollback failed.';
        return NextResponse.json({ error: `${requestError.message} ${rollbackMessage}` }, { status: 500 });
      }
    }

    await releaseClaim();
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }

  try {
    await writeOwnerAudit('request_approved', {
      actorUserId: reviewer.profile.id,
      entityType: 'request',
      entityId: record.id,
      details: {
        type: record.type,
        createdUserId,
        createdEntityId,
        reviewNote: parsed.data.reviewNote || null
      }
    });
  } catch {
    // Approval should stay successful even if audit persistence is temporarily unavailable.
  }

  return NextResponse.json({ ok: true, status: 'approved', userId: createdUserId });
}
