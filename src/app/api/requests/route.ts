import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { normalizePhone, requestSchema, requireAuthorizedUser } from '@/lib/server/auth-utils';
import { validateGymProximity } from '@/lib/server/gym-location';
import { parseListQuery } from '@/lib/server/list-utils';
import { getOwnerRequestsList } from '@/lib/server/owner-list-service';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request payload.' }, { status: 400 });
  }

  let createdBy: string | null = null;
  if (!['client', 'trainer'].includes(parsed.data.type)) {
    try {
      const auth = await requireAuthorizedUser(request, ['trainer']);
      createdBy = auth.profile.id;
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
    }
  }

  const admin = createAdminSupabaseClient();
  let trainerAttendanceBranch: { id: string; label: string } | null = null;
  if (parsed.data.type === 'client' || parsed.data.type === 'trainer' || parsed.data.type === 'member') {
    const payload = parsed.data.data as Record<string, unknown>;
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = normalizePhone(String(payload.phone || ''));

    const [{ data: existingUser, error: existingUserError }, { data: existingEmailRequest, error: emailRequestError }, { data: existingPhoneRequest, error: phoneRequestError }] = await Promise.all([
      admin.from('users').select('id').or(`email.eq.${email},phone.eq.${phone}`).limit(1),
      admin.from('requests').select('id').eq('status', 'pending').eq('type', parsed.data.type).contains('data', { email }).limit(1),
      admin.from('requests').select('id').eq('status', 'pending').eq('type', parsed.data.type).contains('data', { phone }).limit(1)
    ]);

    if (existingUserError || emailRequestError || phoneRequestError) {
      return NextResponse.json({ error: existingUserError?.message || emailRequestError?.message || phoneRequestError?.message || 'Could not validate the request.' }, { status: 500 });
    }

    if ((existingUser && existingUser.length > 0) || (existingEmailRequest && existingEmailRequest.length > 0) || (existingPhoneRequest && existingPhoneRequest.length > 0)) {
      return NextResponse.json({ error: 'A matching account or approval request already exists for this phone number or email.' }, { status: 409 });
    }
  }

  if (parsed.data.type === 'trainer-attendance' && createdBy) {
    const requestDate = String(parsed.data.data.date || new Date().toISOString().slice(0, 10));
    const proximity = validateGymProximity({
      latitude: Number(parsed.data.data.latitude || 0),
      longitude: Number(parsed.data.data.longitude || 0),
      accuracyMeters: typeof parsed.data.data.accuracyMeters === 'number' ? parsed.data.data.accuracyMeters : undefined
    });

    if (!proximity.withinRange || !proximity.activeBranch) {
      return NextResponse.json({
        error: proximity.message,
        distanceMeters: proximity.activeBranch ? Math.round(proximity.activeBranch.distanceMeters) : null,
        distanceLabel: proximity.activeBranch?.distanceLabel || '',
        radiusMeters: proximity.activeBranch?.branch.radiusMeters || null
      }, { status: 403 });
    }

    trainerAttendanceBranch = {
      id: proximity.activeBranch.branch.id,
      label: proximity.activeBranch.branch.label
    };

    const [{ data: existingRequests }, { data: trainer }] = await Promise.all([
      admin
        .from('requests')
        .select('id, data')
        .eq('created_by', createdBy)
        .eq('type', 'trainer-attendance')
        .eq('status', 'pending'),
      admin
        .from('trainers')
        .select('id')
        .eq('user_id', createdBy)
        .maybeSingle()
    ]);

    const alreadyPending = (existingRequests || []).some((item) => {
      const payload = (item.data || {}) as { date?: string };
      return payload.date === requestDate;
    });

    if (alreadyPending) {
      return NextResponse.json({ error: 'Your attendance request for today is already pending approval.' }, { status: 409 });
    }

    if (trainer?.id) {
      const { data: approvedAttendance } = await admin
        .from('trainer_attendance')
        .select('id')
        .eq('trainer_id', trainer.id)
        .eq('date', requestDate)
        .maybeSingle();

      if (approvedAttendance) {
        return NextResponse.json({ error: 'Your attendance for today is already marked.' }, { status: 409 });
      }
    }
  }

  const { data, error } = await admin
    .from('requests')
    .insert({
      type: parsed.data.type,
      data: parsed.data.type === 'trainer-attendance' && createdBy && trainerAttendanceBranch
        ? {
            ...parsed.data.data,
            branchId: trainerAttendanceBranch.id,
            branchLabel: trainerAttendanceBranch.label
          }
        : parsed.data.data,
      status: 'pending',
      created_by: createdBy
    })
    .select('id, status, created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create request.' }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, requestId: data.id, status: data.status, createdAt: data.created_at }, { status: 201 });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    await requireAuthorizedUser(request, ['owner']);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await getOwnerRequestsList(parseListQuery(request, 10)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load requests.' }, { status: 500 });
  }
}
