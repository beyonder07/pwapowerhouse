import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { validateGymProximity } from '@/lib/server/gym-location';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().min(0).max(5000).optional()
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

    const proximity = validateGymProximity(parsed.data);
    if (!proximity.withinRange || !proximity.activeBranch) {
      return NextResponse.json({
        error: proximity.message,
        distanceMeters: proximity.activeBranch ? Math.round(proximity.activeBranch.distanceMeters) : null,
        distanceLabel: proximity.activeBranch?.distanceLabel || '',
        radiusMeters: proximity.activeBranch?.branch.radiusMeters || null
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
        branchLabel: proximity.activeBranch.branch.label,
        distanceMeters: Math.round(proximity.activeBranch.distanceMeters),
        distanceLabel: proximity.activeBranch.distanceLabel
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

    const auditInsert = await admin.from('attendance_audits').insert({
      attendance_id: attendance.id,
      action: existingAttendance ? 'client_checkin_updated' : 'client_checkin_created'
    });
    void auditInsert;

    return NextResponse.json({
      success: true,
      message: `Check-in successful at ${proximity.activeBranch.branch.label}.`,
      date: attendance.date,
      checkInTime: attendance.check_in_time,
      branchLabel: proximity.activeBranch.branch.label,
      distanceMeters: Math.round(proximity.activeBranch.distanceMeters),
      distanceLabel: proximity.activeBranch.distanceLabel
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
