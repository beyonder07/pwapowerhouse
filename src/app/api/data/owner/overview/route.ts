import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getOwnerOverviewSnapshot } from '@/lib/server/analytics-service';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    await requireAuthorizedUser(request, ['owner']);
    return NextResponse.json(await getOwnerOverviewSnapshot());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
