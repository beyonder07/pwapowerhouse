import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { resolveGymBranch, validateGymProximity } from '@/lib/server/gym-location';
import { writeActivityAudit } from '@/lib/server/audit-log';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const schema = z.object({
  branchId: z.string().trim().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracyMeters: z.number().min(0).max(5000).optional()
}).superRefine((value, ctx) => {
  const hasBranch = Boolean(value.branchId);
  const hasCoordinates = typeof value.latitude === 'number' && typeof value.longitude === 'number';
  if (!hasBranch && !hasCoordinates) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose your gym branch or allow location access.' });
  }
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    const auth = await requireAuthorizedUser(request, ['client']);
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid location payload.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id, membership_plan, status, expiry_date')
      .eq('user_id', auth.profile.id)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json({ error: 'Member profile not found.' }, { status: 404 });
    }

    if (member.status !== 'active') {
      return NextResponse.json({ error: 'Your membership is not active right now. Please contact the gym desk.' }, { status: 409 });
    }

    if (member.expiry_date && member.expiry_date < new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: 'Your membership has expired. Please renew before checking in.' }, { status: 409 });
    }

    const chosenBranch = parsed.data.branchId ? resolveGymBranch(parsed.data.branchId) : null;
    if (parsed.data.branchId && !chosenBranch) {
      return NextResponse.json({ error: 'Please choose a valid gym branch.' }, { status: 400 });
    }

    const branchContext = chosenBranch
      ? {
          branch: chosenBranch,
          distanceMeters: 0,
          distanceLabel: '0 m'
        }
      : (() => {
          const proximity = validateGymProximity({
            latitude: Number(parsed.data.latitude || 0),
            longitude: Number(parsed.data.longitude || 0),
            accuracyMeters: parsed.data.accuracyMeters
          });

          if (!proximity.withinRange || !proximity.activeBranch) {
            return proximity;
          }

          return proximity.activeBranch;
        })();

    if (!('branch' in branchContext)) {
      return NextResponse.json({
        error: branchContext.message,
        distanceMeters: branchContext.activeBranch ? Math.round(branchContext.activeBranch.distanceMeters) : null,
        distanceLabel: branchContext.activeBranch?.distanceLabel || '',
        radiusMeters: branchContext.activeBranch?.branch.radiusMeters || null
      }, { status: 403 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: existingAttendance, error: existingError } = await admin
      .from('attendance')
      .select('id, status, check_in_time')
      .eq('member_id', member.id)
      .eq('date', today)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existingAttendance?.status === 'present') {
      return NextResponse.json({
        alreadyCheckedIn: true,
        message: 'Your attendance for today is already marked.',
        date: today,
        checkInTime: existingAttendance.check_in_time,
        branchLabel: branchContext.branch.label,
        distanceMeters: Math.round(branchContext.distanceMeters),
        distanceLabel: branchContext.distanceLabel
      });
    }

    const { data: attendance, error: upsertError } = await admin
      .from('attendance')
      .upsert({
        member_id: member.id,
        date: today,
        status: 'present'
      }, { onConflict: 'member_id,date' })
      .select('id, date, status, check_in_time')
      .single();

    if (upsertError || !attendance) {
      return NextResponse.json({ error: upsertError?.message || 'Could not mark attendance.' }, { status: 500 });
    }

    try {
      await writeActivityAudit(existingAttendance ? 'client_checkin_updated' : 'client_checkin_created', {
        actorUserId: auth.profile.id,
        entityType: 'attendance',
        entityId: attendance.id,
        details: {
          branchId: branchContext.branch.id,
          branchLabel: branchContext.branch.label,
          distanceMeters: Math.round(branchContext.distanceMeters)
        }
      });
    } catch {
      // Attendance should still succeed even if audit persistence is temporarily unavailable.
    }

    return NextResponse.json({
      success: true,
      message: `Check-in successful at ${branchContext.branch.label}.`,
      date: attendance.date,
      checkInTime: attendance.check_in_time,
      branchLabel: branchContext.branch.label,
      distanceMeters: Math.round(branchContext.distanceMeters),
      distanceLabel: branchContext.distanceLabel
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
