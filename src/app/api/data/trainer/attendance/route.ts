import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getTrainerProfileBundle } from '@/lib/server/data-service';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { getGymBranchesConfig } from '@/lib/server/gym-location';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    const auth = await requireAuthorizedUser(request, ['trainer']);
    const bundle = await getTrainerProfileBundle(auth.profile.id);
    if (!bundle) {
      return NextResponse.json({ error: 'Trainer profile not found.' }, { status: 404 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const gymBranches = getGymBranchesConfig();

    return NextResponse.json({
      memberAttendance: bundle.memberAttendance.slice(0, 20).map((item) => ({
        id: item.id,
        date: item.date,
        memberName: (bundle.members.find((row) => row.id === item.member_id)?.user as { name?: string })?.name || 'Member',
        status: item.status,
        checkInTime: item.check_in_time
      })),
      trainerAttendance: bundle.trainerAttendance.map((item) => ({
        id: item.id,
        date: item.date,
        checkInTime: item.check_in_time
      })),
      gymBranches,
      hasApprovedTodayAttendance: bundle.trainerAttendance.some((item) => item.date === today),
      hasPendingTodayRequest: bundle.requests.some((item) => {
        const payload = (item.data || {}) as { date?: string };
        return item.type === 'trainer-attendance'
          && item.status === 'pending'
          && payload.date === today;
      })
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
