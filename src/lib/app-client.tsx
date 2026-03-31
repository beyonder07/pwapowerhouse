'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, authedFetch, clearSession, getStoredSession, routeForRole, type ViewerRole } from './auth';

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  role: ViewerRole;
};

export function useRoleSession(allowedRoles: ViewerRole[]) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(() => getStoredSession());
  const allowedRolesKey = useMemo(() => allowedRoles.join('|'), [allowedRoles]);
  const ready = Boolean(session.accessToken && allowedRoles.includes(session.role));

  useEffect(() => {
    if (!session.accessToken) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!allowedRoles.includes(session.role)) {
      router.replace(session.role ? routeForRole(session.role) : '/login');
      return;
    }
  }, [allowedRoles, allowedRolesKey, router, session.accessToken, session.role]);

  const logout = useCallback(() => {
    void fetch(`${API_URL}/api/auth/logout`, { method: 'POST' }).catch(() => null);
    clearSession();
    router.replace('/login');
  }, [router]);

  return { session, setSession, ready, logout };
}

export function useAuthedPageData<T>(endpoint: string, allowedRoles: ViewerRole[]) {
  const router = useRouter();
  const { session, setSession, ready, logout } = useRoleSession(allowedRoles);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!ready || !session.accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await authedFetch(`${API_URL}${endpoint}`, session.accessToken, session.refreshToken, session.role);
    if (!result.session) {
      clearSession();
      router.replace('/login');
      return;
    }

    setSession(result.session);
    if (!result.response.ok) {
      const json = await result.response.json().catch(() => ({ error: 'Failed to load page data' }));
      setError(String(json.error || 'Failed to load page data'));
      setLoading(false);
      return;
    }

    const json = await result.response.json();
    setData(json as T);
    setLoading(false);
  }, [endpoint, ready, router, session.accessToken, session.refreshToken, session.role, setSession]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const timer = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [ready, reload]);

  return {
    session,
    setSession,
    ready,
    logout,
    data,
    setData,
    loading,
    error,
    setError,
    reload
  };
}

export async function authedJson<T>(path: string, session: SessionState) {
  const result = await authedFetch(`${API_URL}${path}`, session.accessToken, session.refreshToken, session.role);
  if (!result.session) {
    return { ok: false, unauthorized: true, data: null as T | null, error: 'Session expired', session: null };
  }

  const json = await result.response.json().catch(() => null);
  if (!result.response.ok) {
    return {
      ok: false,
      unauthorized: result.response.status === 401,
      data: null as T | null,
      error: String((json as { error?: string } | null)?.error || 'Request failed'),
      session: result.session
    };
  }

  return { ok: true, unauthorized: false, data: json as T, error: null, session: result.session };
}

export async function authedJsonRequest<T>(path: string, session: SessionState, init: RequestInit) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const result = await authedFetch(
    `${API_URL}${path}`,
    session.accessToken,
    session.refreshToken,
    session.role,
    {
      ...init,
      headers
    }
  );
  if (!result.session) {
    return { ok: false, unauthorized: true, data: null as T | null, error: 'Session expired', session: null };
  }

  const json = await result.response.json().catch(() => null);
  if (!result.response.ok) {
    return {
      ok: false,
      unauthorized: result.response.status === 401,
      data: null as T | null,
      error: String((json as { error?: string } | null)?.error || 'Request failed'),
      session: result.session
    };
  }

  return { ok: true, unauthorized: false, data: json as T, error: null, session: result.session };
}
