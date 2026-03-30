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

    return NextResponse.json({
      membership: {
        planType: bundle.member.membership_plan,
        startDate: bundle.member.start_date,
        expiryDate: bundle.member.expiry_date,
        status: bundle.member.status,
        daysRemaining: Math.max(Math.ceil((new Date(bundle.member.expiry_date).getTime() - Date.now()) / 86400000), 0)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

