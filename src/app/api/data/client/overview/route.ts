import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getClientProfileBundle } from '@/lib/server/data-service';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    const auth = await requireAuthorizedUser(request, ['client']);
    const bundle = await getClientProfileBundle(auth.profile.id);
    if (!bundle) {
      return NextResponse.json({ error: 'Client profile not found.' }, { status: 404 });
    }

    const latestPayment = bundle.payments[0] || null;
    return NextResponse.json({
      profile: { name: bundle.user.name },
      membership: {
        planType: bundle.member.membership_plan,
        expiryDate: bundle.member.expiry_date,
        daysRemaining: Math.max(Math.ceil((new Date(bundle.member.expiry_date).getTime() - Date.now()) / 86400000), 0),
        status: bundle.member.status
      },
      attendanceSummary: {
        month: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        presentCount: bundle.attendanceThisMonth.filter((item) => item.status === 'present').length,
        totalRecorded: bundle.attendanceThisMonth.length
      },
      latestPayment: latestPayment ? {
        amount: Number(latestPayment.amount || 0),
        date: latestPayment.date,
        paymentMode: latestPayment.mode,
        status: latestPayment.status
      } : null,
      workoutPlan: bundle.member.workout_plan || null,
      assignedTrainer: bundle.trainer?.user ? { name: (bundle.trainer.user as { name?: string }).name || 'Assigned trainer' } : null
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

