import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  try {
    await requireAuthorizedUser(request, ['owner']);
    const admin = createAdminSupabaseClient();
    const [{ data: records }, { data: audits }] = await Promise.all([
      admin.from('attendance').select('id, member_id, date, status').order('date', { ascending: false }),
      admin.from('attendance_audits').select('id, action, changed_at').order('changed_at', { ascending: false })
    ]);

    return NextResponse.json({
      records: (records || []).map((item) => ({
        _id: String(item.id),
        member_id: item.member_id,
        date: item.date,
        status: item.status
      })),
      audits: (audits || []).map((item) => ({
        _id: String(item.id),
        action: item.action,
        changed_at: item.changed_at
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

