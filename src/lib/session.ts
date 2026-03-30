export const ACCESS_TOKEN_COOKIE = 'ph_access_token';
export const REFRESH_TOKEN_COOKIE = 'ph_refresh_token';

export type ViewerRole = 'admin' | 'staff' | 'owner' | 'trainer' | 'client' | '';

type TokenClaims = {
  role?: ViewerRole | 'authenticated';
  user_metadata?: {
    role?: ViewerRole;
  };
  app_metadata?: {
    role?: ViewerRole;
  };
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  if (typeof atob === 'function') {
    return atob(padded);
  }

  return Buffer.from(padded, 'base64').toString('utf8');
}

export function parseTokenClaims(token: string): TokenClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payload)) as TokenClaims;
  } catch {
    return null;
  }
}

export function deriveRoleFromToken(token: string): ViewerRole {
  const claims = parseTokenClaims(token);
  const explicitRole = claims?.user_metadata?.role || claims?.app_metadata?.role;
  if (explicitRole === 'owner' || explicitRole === 'trainer' || explicitRole === 'client' || explicitRole === 'admin' || explicitRole === 'staff') {
    return explicitRole;
  }

  if (claims?.role === 'owner' || claims?.role === 'trainer' || claims?.role === 'client' || claims?.role === 'admin' || claims?.role === 'staff') {
    return claims.role;
  }

  return '';
}

export function routeForRole(role: ViewerRole) {
  switch (role) {
    case 'client':
      return '/client';
    case 'trainer':
      return '/trainer';
    case 'owner':
    case 'admin':
    case 'staff':
      return '/owner';
    default:
      return '/login';
  }
}

export function extractRoleFromSupabaseUser(user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
} | null | undefined): ViewerRole {
  const userRole = typeof user?.user_metadata?.role === 'string' ? user.user_metadata.role : '';
  const appRole = typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : '';
  const role = userRole || appRole || '';
  if (role === 'owner' || role === 'trainer' || role === 'client' || role === 'admin' || role === 'staff') {
    return role;
  }

  return '';
}
