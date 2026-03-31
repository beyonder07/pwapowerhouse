'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const allowedRolesKey = allowedRoles.join('|');
  const allowedRoleSet = useMemo(() => new Set(allowedRolesKey.split('|').filter(Boolean) as ViewerRole[]), [allowedRolesKey]);
  const ready = Boolean(session.accessToken && allowedRoleSet.has(session.role));

  useEffect(() => {
    if (!session.accessToken) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!allowedRoleSet.has(session.role)) {
      router.replace(session.role ? routeForRole(session.role) : '/login');
      return;
    }
  }, [allowedRoleSet, router, session.accessToken, session.role]);

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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const syncSession = useCallback((nextSession: SessionState) => {
    setSession((current) => {
      if (
        current.accessToken === nextSession.accessToken &&
        current.refreshToken === nextSession.refreshToken &&
        current.role === nextSession.role
      ) {
        return current;
      }

      return nextSession;
    });
  }, [setSession]);

  const reload = useCallback(async () => {
    if (!ready || !session.accessToken) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const isInitialLoad = !hasLoadedRef.current;

    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const result = await authedFetch(`${API_URL}${endpoint}`, session.accessToken, session.refreshToken, session.role);
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!result.session) {
        clearSession();
        router.replace('/login');
        return;
      }

      syncSession(result.session);
      if (!result.response.ok) {
        const json = await result.response.json().catch(() => ({ error: 'Failed to load page data' }));
        setError(String(json.error || 'Failed to load page data'));
        return;
      }

      const json = await result.response.json();
      hasLoadedRef.current = true;
      setData(json as T);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [endpoint, ready, router, session.accessToken, session.refreshToken, session.role, syncSession]);

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
    refreshing,
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
