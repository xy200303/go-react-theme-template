import { create } from 'zustand';
import { clearAuthState, loadAuthState, saveAuthState } from '@/lib/storage';
import type { AuthToken, AuthUser } from '@/types/auth';

interface AuthStore {
  token: AuthToken | null;
  user: AuthUser | null;
  setLogin: (token: AuthToken, user: AuthUser) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearLogin: () => void;
  isAdmin: () => boolean;
}

const initial = loadAuthState();

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: initial.token,
  user: initial.user,
  setLogin: (token, user) => {
    saveAuthState({ token, user });
    set({ token, user });
  },
  updateUser: (userPatch) => {
    const current = get().user;
    if (!current) return;
    const next = { ...current, ...userPatch };
    saveAuthState({ token: get().token, user: next });
    set({ user: next });
  },
  clearLogin: () => {
    clearAuthState();
    set({ token: null, user: null });
  },
  isAdmin: () => {
    const roles = get().user?.roles ?? [];
    return roles.includes('admin');
  }
}));
