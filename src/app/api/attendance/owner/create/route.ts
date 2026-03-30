import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { isFutureIsoDate, isStrictIsoDate, requireAuthorizedUser } from '@/lib/server/auth-utils';

const schema = z.object({
  member_id: z.number().int().positive(),
  date: z.string()
    .refine((value) => isStrictIsoDate(value), 'Date must use YYYY-MM-DD format.')
    .refine((value) => !isFutureIsoDate(value), 'Future attendance cannot be added.'),
  status: z.enum(['present', 'absent'])
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    await requireAuthorizedUser(request, ['owner']);
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid attendance payload.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('attendance')
      .upsert({
        member_id: parsed.data.member_id,
        date: parsed.data.date,
        status: parsed.data.status
      }, { onConflict: 'member_id,date' })
      .select('id, member_id, date, status')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not create attendance record.' }, { status: 500 });
    }

    await admin.from('attendance_audits').insert({
      attendance_id: data.id,
      action: 'created'
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
