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

  throw new Error(
    provider
      ? `Unsupported OTP delivery provider: ${provider}`
      : 'OTP delivery is not configured. Set OTP_DELIVERY_PROVIDER before using forgot password.'
  );
}
