export const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
export const PUBLIC_GYM_ID = process.env.NEXT_PUBLIC_GYM_ID || 'powerhouse-default';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, deriveRoleFromToken, routeForRole, type ViewerRole } from './session';

export { routeForRole };
export type { ViewerRole } from './session';

function setClientCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 7) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function clearClientCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function getCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : '';
}

export function getStoredSession() {
  if (typeof window === 'undefined') {
    return {
      accessToken: '',
      refreshToken: '',
      role: '' as ViewerRole
    };
  }

  const accessToken = window.localStorage.getItem('cloud_access_token') || window.localStorage.getItem('cloud_token') || getCookieValue(ACCESS_TOKEN_COOKIE) || '';
  const refreshToken = window.localStorage.getItem('cloud_refresh_token') || getCookieValue(REFRESH_TOKEN_COOKIE) || '';
  const role = deriveRoleFromToken(accessToken || '');

  return {
    accessToken,
    refreshToken,
    role
  };
}

export function saveSession(accessToken: string, refreshToken: string, explicitRole?: ViewerRole) {
  const role = (deriveRoleFromToken(accessToken) || explicitRole || '') as ViewerRole;
  window.localStorage.setItem('cloud_access_token', accessToken);
  window.localStorage.setItem('cloud_refresh_token', refreshToken);
  window.localStorage.setItem('cloud_token', accessToken);
  setClientCookie(ACCESS_TOKEN_COOKIE, accessToken);
  setClientCookie(REFRESH_TOKEN_COOKIE, refreshToken);
  return {
    accessToken,
    refreshToken,
    role
  };
}

export function clearSession() {
  window.localStorage.removeItem('cloud_access_token');
  window.localStorage.removeItem('cloud_refresh_token');
  window.localStorage.removeItem('cloud_token');
  clearClientCookie(ACCESS_TOKEN_COOKIE);
  clearClientCookie(REFRESH_TOKEN_COOKIE);
}

export async function refreshSession(refreshToken: string, currentRole?: ViewerRole) {
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const json = await response.json();
    if (!response.ok) {
      return null;
    }

    const nextAccessToken = String(json.accessToken || json.token || '');
    const nextRefreshToken = String(json.refreshToken || '');
    if (!nextAccessToken || !nextRefreshToken) {
      return null;
    }

    const nextRole = (deriveRoleFromToken(nextAccessToken) || json.role || currentRole || '') as ViewerRole;
    return saveSession(nextAccessToken, nextRefreshToken, nextRole);
  } catch {
    return null;
  }
}

export async function authedFetch(
  url: string,
  accessToken: string,
  refreshToken: string,
  currentRole: ViewerRole = '',
  init: RequestInit = {}
) {
  const run = (token: string) => {
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, {
      ...init,
      headers
    });
  };

  const first = await run(accessToken);
  if (first.status !== 401) {
    return {
      response: first,
      session: { accessToken, refreshToken, role: currentRole || deriveRoleFromToken(accessToken) }
    };
  }

  const refreshed = await refreshSession(refreshToken, currentRole);
  if (!refreshed) {
    return {
      response: first,
      session: null
    };
  }

  return {
    response: await run(refreshed.accessToken),
    session: refreshed
  };
}
