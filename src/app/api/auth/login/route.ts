import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { createPublicSupabaseClient, loginSchema, resolveUserByIdentifier } from '@/lib/server/auth-utils';
import { consumeRateLimit, getRequestIp } from '@/lib/server/rate-limit';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured yet.' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid login payload.' }, { status: 400 });
  }

  const ip = getRequestIp(request);
  const identifierKey = parsed.data.identifier.trim().toLowerCase();
  const ipLimit = consumeRateLimit(`login:ip:${ip}`, 10, 10 * 60 * 1000);
  const identifierLimit = consumeRateLimit(`login:id:${identifierKey}`, 6, 10 * 60 * 1000);
  if (!ipLimit.allowed || !identifierLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(ipLimit.retryAfterSeconds, identifierLimit.retryAfterSeconds))
        }
      }
    );
  }

  try {
    const resolved = await resolveUserByIdentifier(parsed.data.identifier);
    if (!resolved) {
      return NextResponse.json({ error: 'Phone number, email, or password is incorrect.' }, { status: 401 });
    }

    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password: parsed.data.password
    });

    if (error || !data.session) {
      return NextResponse.json({ error: 'Phone number, email, or password is incorrect.' }, { status: 401 });
    }

    const response = NextResponse.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      role: resolved.role
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
  } catch {
    return NextResponse.json({ error: 'Phone number, email, or password is incorrect.' }, { status: 401 });
  }
}
