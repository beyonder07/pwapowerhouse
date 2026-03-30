import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSupabaseConfigured } from '@/lib/env';
import { createPublicSupabaseClient } from '@/lib/server/auth-utils';
import { consumeRateLimit, getRequestIp } from '@/lib/server/rate-limit';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, deriveRoleFromToken } from '@/lib/session';

type SessionUserWithRole = {
  user_metadata?: {
    role?: string;
  };
  app_metadata?: {
    role?: string;
  };
};

const schema = z.object({
  refreshToken: z.string().min(10)
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid refresh request.' }, { status: 400 });
  }

  const ip = getRequestIp(request);
  const refreshLimit = consumeRateLimit(`refresh:ip:${ip}`, 20, 10 * 60 * 1000);
  if (!refreshLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many session refresh attempts. Please sign in again.' },
      { status: 429, headers: { 'Retry-After': String(refreshLimit.retryAfterSeconds) } }
    );
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: parsed.data.refreshToken
  });

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message || 'Could not refresh session.' }, { status: 401 });
  }

  const response = NextResponse.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    role: deriveRoleFromToken(data.session.access_token) || ((data.user as SessionUserWithRole | null)?.user_metadata?.role
      || (data.user as SessionUserWithRole | null)?.app_metadata?.role
      || '')
  });
  response.cookies.set(ACCESS_TOKEN_COOKIE, data.session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, data.session.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}
