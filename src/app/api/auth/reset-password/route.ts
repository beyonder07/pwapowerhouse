import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { consumeRateLimit, getRequestIp } from '@/lib/server/rate-limit';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { resetPasswordSchema } from '@/lib/server/auth-utils';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid reset payload.' }, { status: 400 });
  }

  const ip = getRequestIp(request);
  const ipLimit = consumeRateLimit(`reset-password:ip:${ip}`, 8, 10 * 60 * 1000);
  const requestLimit = consumeRateLimit(`reset-password:request:${parsed.data.requestId}`, 5, 10 * 60 * 1000);
  if (!ipLimit.allowed || !requestLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many password reset attempts. Please start again in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(ipLimit.retryAfterSeconds, requestLimit.retryAfterSeconds)) } }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: record, error: fetchError } = await admin
    .from('password_reset_requests')
    .select('id, user_id, reset_token, verified_at, expires_at')
    .eq('id', parsed.data.requestId)
    .maybeSingle();

  if (fetchError || !record) {
    return NextResponse.json({ error: 'This reset request is no longer available. Please request a new code.' }, { status: 404 });
  }

  if (!record.verified_at || record.reset_token !== parsed.data.resetToken) {
    return NextResponse.json({ error: 'Reset token is invalid.' }, { status: 401 });
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Reset token expired.' }, { status: 410 });
  }

  const { error: updateAuthError } = await admin.auth.admin.updateUserById(record.user_id, {
    password: parsed.data.password
  });

  if (updateAuthError) {
    return NextResponse.json({ error: updateAuthError.message }, { status: 500 });
  }

  await admin
    .from('password_reset_requests')
    .delete()
    .eq('id', parsed.data.requestId);

  return NextResponse.json({ ok: true });
}
