import type { AuthToken, AuthUser } from '@/types/auth';

const AUTH_KEY = 'enterprise_auth_state';

export interface AuthStateCache {
  token: AuthToken | null;
  user: AuthUser | null;
}

export function saveAuthState(state: AuthStateCache): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function loadAuthState(): AuthStateCache {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return { token: null, user: null };
  try {
    return JSON.parse(raw) as AuthStateCache;
  } catch {
    return { token: null, user: null };
  }
}

export function clearAuthState(): void {
  localStorage.removeItem(AUTH_KEY);
}
