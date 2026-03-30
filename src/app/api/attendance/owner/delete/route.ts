import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireAuthorizedUser } from '@/lib/server/auth-utils';

const schema = z.object({
  id: z.string().min(1)
});

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }
  try {
    await requireAuthorizedUser(request, ['owner']);
    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid attendance delete payload.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    await admin.from('attendance_audits').insert({
      attendance_id: Number(parsed.data.id),
      action: 'deleted'
    });
    const { error } = await admin.from('attendance').delete().eq('id', Number(parsed.data.id));
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deletedId: parsed.data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
