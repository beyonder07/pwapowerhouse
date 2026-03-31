import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { getOwnerAnalyticsSnapshot } from '@/lib/server/analytics-service';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    await requireAuthorizedUser(request, ['owner']);
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get('branch') || 'all';
    return NextResponse.json(await getOwnerAnalyticsSnapshot(branch));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
