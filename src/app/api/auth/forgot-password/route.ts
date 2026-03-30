import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { sendOtpCode } from '@/lib/server/otp-delivery';
import { encodeOtpRecord } from '@/lib/server/otp-security';
import { consumeRateLimit, getRequestIp } from '@/lib/server/rate-limit';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { forgotPasswordSchema, isEmail, makeOtpCode, normalizePhone, resolveUserByIdentifier } from '@/lib/server/auth-utils';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid reset request.' }, { status: 400 });
  }

  const identifier = parsed.data.phone || parsed.data.email || '';
  const ip = getRequestIp(request);
  const ipLimit = consumeRateLimit(`forgot:ip:${ip}`, 5, 10 * 60 * 1000);
  const accountLimit = consumeRateLimit(`forgot:account:${parsed.data.role}:${identifier.trim().toLowerCase()}`, 3, 10 * 60 * 1000);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many code requests. Please wait a little and try again.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds)) } }
    );
  }

  const resolved = await resolveUserByIdentifier(
    isEmail(identifier) ? identifier.trim().toLowerCase() : normalizePhone(identifier),
    parsed.data.role
  );

  if (!resolved) {
    return NextResponse.json({ error: 'We could not match those details to an account. Please check the phone number or email and try again.' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const otpCode = makeOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const requestId = randomUUID();
  const usePhoneChannel = parsed.data.role === 'owner' || Boolean(normalizePhone(parsed.data.phone || ''));
  const destination = usePhoneChannel
    ? normalizePhone(parsed.data.phone || resolved.phone)
    : resolved.email;
  const channel = usePhoneChannel ? 'sms' as const : 'email' as const;

  const { data, error } = await admin
    .from('password_reset_requests')
    .insert({
      id: requestId,
      user_id: resolved.id,
      role: resolved.role,
      destination,
      otp_code: encodeOtpRecord(requestId, otpCode),
      expires_at: expiresAt
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create reset request.' }, { status: 500 });
  }

  try {
    const delivery = await sendOtpCode({
      role: resolved.role,
      destination,
      channel,
      otpCode
    });

    return NextResponse.json({
      requestId: data.id,
      destination: delivery.maskedDestination,
      channel: delivery.channel,
      otpPreview: delivery.otpPreview
    });
  } catch (deliveryError) {
    await admin.from('password_reset_requests').delete().eq('id', data.id);
    return NextResponse.json({
      error: deliveryError instanceof Error ? deliveryError.message : 'Could not deliver OTP.'
    }, { status: 500 });
  }

}
