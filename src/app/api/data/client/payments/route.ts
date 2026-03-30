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
      items: bundle.payments.map((item) => ({
        id: item.id,
        amount: Number(item.amount || 0),
        paymentMode: item.mode,
        date: item.date,
        status: item.status
      })),
      totalPaid: bundle.payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

