import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getTrainerProfileBundle } from '@/lib/server/data-service';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

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
    const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return NextResponse.json({
      profile: { name: bundle.user.name },
      metrics: {
        assignedMembers: bundle.members.length,
        pendingRequests: bundle.requests.filter((item) => item.status === 'pending').length,
        todayMemberCheckIns: bundle.memberAttendance.filter((item) => item.date === today && item.status === 'present').length,
        monthAttendance: bundle.trainerAttendance.filter((item) => item.date.startsWith(today.slice(0, 7))).length
      },
      salarySnapshot: {
        month,
        amount: Number(bundle.trainer.salary || 0),
        status: 'pending'
      },
      todayCheckIns: bundle.memberAttendance.filter((item) => item.date === today).slice(0, 10).map((item) => {
        const member = bundle.members.find((row) => row.id === item.member_id);
        return {
          id: item.id,
          memberName: (member?.user as { name?: string })?.name || 'Member',
          date: item.date,
          status: item.status,
          checkInTime: item.check_in_time
        };
      })
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

