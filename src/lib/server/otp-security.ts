import { createHash, timingSafeEqual } from 'node:crypto';

type OtpRecord = {
  hash: string;
  attempts: number;
};

function getOtpPepper() {
  return process.env.OTP_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || 'powerhouse-dev-pepper';
}

export function hashOtpCode(requestId: string, otpCode: string) {
  return createHash('sha256')
    .update(`${requestId}:${otpCode}:${getOtpPepper()}`)
    .digest('hex');
}

export function encodeOtpRecord(requestId: string, otpCode: string, attempts = 0) {
  return encodeOtpHash(hashOtpCode(requestId, otpCode), attempts);
}

export function decodeOtpRecord(value: string): OtpRecord {
  try {
    const parsed = JSON.parse(value) as Partial<OtpRecord>;
    return {
      hash: String(parsed.hash || ''),
      attempts: Number(parsed.attempts || 0)
    };
  } catch {
    return {
      hash: value,
      attempts: 0
    };
  }
}

export function encodeOtpHash(hash: string, attempts = 0) {
  return JSON.stringify({
    hash,
    attempts
  } satisfies OtpRecord);
}

export function verifyOtpCode(requestId: string, otpCode: string, storedValue: string) {
  const decoded = decodeOtpRecord(storedValue);
  const expected = Buffer.from(decoded.hash, 'hex');
  const actual = Buffer.from(hashOtpCode(requestId, otpCode), 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
