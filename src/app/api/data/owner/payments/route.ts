import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';
import { parseListQuery } from '@/lib/server/list-utils';
import { getOwnerPaymentsList } from '@/lib/server/owner-list-service';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    await requireAuthorizedUser(request, ['owner']);
    return NextResponse.json(await getOwnerPaymentsList(parseListQuery(request, 10)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
