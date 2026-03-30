import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, extractRoleFromSupabaseUser, routeForRole, type ViewerRole } from './lib/session';

function isProtectedPath(pathname: string) {
  return pathname.startsWith('/owner') || pathname.startsWith('/trainer') || pathname.startsWith('/client');
}

function roleAllowedForPath(role: ViewerRole, pathname: string) {
  if (pathname.startsWith('/owner')) {
    return role === 'owner' || role === 'admin' || role === 'staff';
  }
  if (pathname.startsWith('/trainer')) {
    return role === 'trainer';
  }
  if (pathname.startsWith('/client')) {
    return role === 'client';
  }
  return true;
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', request.nextUrl.pathname);
  return url;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsAuth = isProtectedPath(pathname);
  const isLoginLike = pathname === '/login' || pathname === '/';

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return needsAuth ? NextResponse.redirect(loginRedirect(request)) : NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || '';
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value || '';
  let verifiedUser: Awaited<ReturnType<ReturnType<typeof createClient>['auth']['getUser']>>['data']['user'] | null = null;
  let nextAccessToken = accessToken;
  let nextRefreshToken = refreshToken;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    verifiedUser = data.user ?? null;
  }

  if (!verifiedUser && refreshToken) {
    const { data } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (data.session?.access_token && data.session?.refresh_token) {
      nextAccessToken = data.session.access_token;
      nextRefreshToken = data.session.refresh_token;
      verifiedUser = data.user ?? data.session.user ?? null;
    }
  }

  const role = extractRoleFromSupabaseUser(verifiedUser);

  if (needsAuth && (!verifiedUser || !role || !roleAllowedForPath(role, pathname))) {
    const response = NextResponse.redirect(loginRedirect(request));
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  if (isLoginLike && verifiedUser && role) {
    return NextResponse.redirect(new URL(routeForRole(role), request.url));
  }

  const response = NextResponse.next();
  if (nextAccessToken && nextAccessToken !== accessToken) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, nextAccessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60
    });
  }
  if (nextRefreshToken && nextRefreshToken !== refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, nextRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
};
