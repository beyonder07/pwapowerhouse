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
      calendar: {
        month: new Date().toISOString().slice(0, 7),
        entries: bundle.attendance.map((item) => ({ date: item.date, status: item.status }))
      },
      recent: bundle.attendance.slice(0, 12).map((item) => ({
        id: item.id,
        date: item.date,
        checkInTime: item.check_in_time,
        status: item.status
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

