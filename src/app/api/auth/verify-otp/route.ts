import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { decodeOtpRecord, encodeOtpHash, verifyOtpCode } from '@/lib/server/otp-security';
import { consumeRateLimit, getRequestIp } from '@/lib/server/rate-limit';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { verifyOtpSchema } from '@/lib/server/auth-utils';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = verifyOtpSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid OTP payload.' }, { status: 400 });
  }

  const ip = getRequestIp(request);
  const ipLimit = consumeRateLimit(`verify-otp:ip:${ip}`, 12, 10 * 60 * 1000);
  const requestLimit = consumeRateLimit(`verify-otp:request:${parsed.data.requestId}`, 8, 10 * 60 * 1000);
  if (!ipLimit.allowed || !requestLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many code attempts. Please request a new code in a few minutes.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(ipLimit.retryAfterSeconds, requestLimit.retryAfterSeconds)) } }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: record, error: fetchError } = await admin
    .from('password_reset_requests')
    .select('id, otp_code, expires_at')
    .eq('id', parsed.data.requestId)
    .maybeSingle();

  if (fetchError || !record) {
    return NextResponse.json({ error: 'Reset request not found.' }, { status: 404 });
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'OTP expired.' }, { status: 410 });
  }

  const otpRecord = decodeOtpRecord(record.otp_code);
  if (otpRecord.attempts >= 5) {
    return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
  }

  if (!verifyOtpCode(parsed.data.requestId, parsed.data.otp, record.otp_code)) {
    const nextAttempts = otpRecord.attempts + 1;
    await admin
      .from('password_reset_requests')
      .update({
        otp_code: encodeOtpHash(otpRecord.hash, nextAttempts)
      })
      .eq('id', parsed.data.requestId);

    return NextResponse.json({
      error: nextAttempts >= 5
        ? 'Too many incorrect attempts. Please request a new code.'
        : 'The code did not match. Please try again.'
    }, { status: nextAttempts >= 5 ? 429 : 401 });
  }

  const resetToken = randomUUID();
  const { error: updateError } = await admin
    .from('password_reset_requests')
    .update({
      verified_at: new Date().toISOString(),
      reset_token: resetToken
    })
    .eq('id', parsed.data.requestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ resetToken });
}
