import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

const schema = z.object({
  id: z.string().min(1),
  status: z.enum(['present', 'absent'])
});

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    await requireAuthorizedUser(request, ['owner']);
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid attendance update payload.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('attendance')
      .update({ status: parsed.data.status })
      .eq('id', Number(parsed.data.id))
      .select('id, member_id, date, status')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not update attendance.' }, { status: 500 });
    }

    await admin.from('attendance_audits').insert({
      attendance_id: data.id,
      action: 'updated'
    });

    return NextResponse.json({
      _id: String(data.id),
      member_id: data.member_id,
      date: data.date,
      status: data.status
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}

