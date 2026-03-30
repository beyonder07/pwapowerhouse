import { getOptionalEnv } from '@/lib/env';

export type OtpChannel = 'sms' | 'email';

type SendOtpInput = {
  role: 'owner' | 'trainer' | 'client';
  destination: string;
  channel: OtpChannel;
  otpCode: string;
};

type SendOtpResult = {
  maskedDestination: string;
  channel: OtpChannel;
  otpPreview?: string;
};

function maskDestination(value: string, channel: OtpChannel) {
  if (!value) {
    return '';
  }

  if (channel === 'email') {
    const [localPart, domain = ''] = value.split('@');
    const visibleLocal = localPart.slice(0, 2);
    const hiddenLocal = '*'.repeat(Math.max(localPart.length - 2, 1));
    return `${visibleLocal}${hiddenLocal}@${domain}`;
  }

  const lastFour = value.slice(-4);
  return `${'*'.repeat(Math.max(value.length - 4, 4))}${lastFour}`;
}

function buildOtpMessage(input: SendOtpInput) {
  const roleLabel = input.role === 'owner'
    ? 'owner'
    : input.role === 'trainer'
      ? 'trainer'
      : 'member';

  return {
    subject: 'Your PowerHouse Gym verification code',
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
        <h1 style="margin:0 0 12px;font-size:24px;color:#dc2626;">PowerHouse Gym</h1>
        <p style="margin:0 0 12px;line-height:1.6;">Use this verification code to continue your ${roleLabel} password reset.</p>
        <div style="margin:20px 0;padding:16px 20px;border-radius:16px;background:#111827;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:0.24em;text-align:center;">
          ${input.otpCode}
        </div>
        <p style="margin:0 0 8px;line-height:1.6;">This code will expire in 10 minutes.</p>
        <p style="margin:0;line-height:1.6;color:#6b7280;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `PowerHouse Gym verification code: ${input.otpCode}. This code expires in 10 minutes.`
  };
}

async function sendViaWebhook(input: SendOtpInput) {
  const webhookUrl = getOptionalEnv('OTP_WEBHOOK_URL');
  if (!webhookUrl) {
    throw new Error('OTP_WEBHOOK_URL is missing for webhook delivery.');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(getOptionalEnv('OTP_WEBHOOK_AUTH_HEADER')
        ? { Authorization: getOptionalEnv('OTP_WEBHOOK_AUTH_HEADER') }
        : {})
    },
    body: JSON.stringify({
      role: input.role,
      channel: input.channel,
      destination: input.destination,
      code: input.otpCode
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || 'OTP webhook rejected the request.');
  }
}

async function sendViaResend(input: SendOtpInput) {
  if (input.channel !== 'email') {
    const webhookUrl = getOptionalEnv('OTP_WEBHOOK_URL');
    if (webhookUrl) {
      await sendViaWebhook(input);
      return;
    }

    throw new Error('Phone-based OTP delivery still needs an SMS webhook provider. Resend only sends email.');
  }

  const apiKey = getOptionalEnv('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is missing for Resend delivery.');
  }

  const fromEmail = getOptionalEnv('RESEND_FROM_EMAIL') || 'PowerHouse Gym <onboarding@resend.dev>';
  const { subject, html, text } = buildOtpMessage(input);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [input.destination],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || 'Resend rejected the OTP email request.');
  }
}

export async function sendOtpCode(input: SendOtpInput): Promise<SendOtpResult> {
  const provider = getOptionalEnv('OTP_DELIVERY_PROVIDER') || (process.env.NODE_ENV === 'production' ? '' : 'dev-log');

  if (provider === 'dev-log') {
    console.log(`[otp:${input.channel}] ${input.destination} -> ${input.otpCode}`);
    return {
      maskedDestination: maskDestination(input.destination, input.channel),
      channel: input.channel,
      otpPreview: process.env.NODE_ENV === 'production' ? undefined : input.otpCode
    };
  }

  if (provider === 'webhook') {
    await sendViaWebhook(input);
    return {
      maskedDestination: maskDestination(input.destination, input.channel),
      channel: input.channel
    };
  }

  if (provider === 'resend') {
    await sendViaResend(input);
    return {
      maskedDestination: maskDestination(input.destination, input.channel),
      channel: input.channel
    };
  }

  throw new Error(
    provider
      ? `Unsupported OTP delivery provider: ${provider}`
      : 'OTP delivery is not configured. Set OTP_DELIVERY_PROVIDER before using forgot password.'
  );
}
