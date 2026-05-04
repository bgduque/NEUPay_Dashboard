import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthResponse, ProfileSummary } from '@/api/types';
import {
  bindAuthSink,
  setAuthTokens,
  setStepUpToken,
} from '@/api/client';
import * as authApi from '@/api/auth';

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: ProfileSummary;
  // Step-up state lives in axios + memory only, so it doesn't survive reloads.
  // The user re-confirms their password each session before a privileged op.
}

interface AuthState {
  session: AuthSession | null;
  loginError: string | null;
  loading: boolean;
  hydrate: () => void;
  signIn: (principal: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Internal: called by the axios refresh interceptor. */
  applyRefresh: (next: AuthResponse) => void;
  /** Used after a successful step-up. */
  setStepUp: (token: string, expiresAt: string) => void;
  clearStepUp: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      loginError: null,
      loading: false,

      hydrate: () => {
        const s = get().session;
        if (s) setAuthTokens(s.accessToken, s.refreshToken);
      },

      signIn: async (principal, password) => {
        set({ loading: true, loginError: null });
        try {
          const auth = await authApi.login({ principal, password });
          setAuthTokens(auth.accessToken, auth.refreshToken);
          set({
            session: {
              accessToken: auth.accessToken,
              refreshToken: auth.refreshToken,
              user: auth.user,
            },
            loading: false,
          });
        } catch (err) {
          const msg = (err as { response?: { data?: { message?: string } }; message?: string })
            ?.response?.data?.message ?? (err as Error).message ?? 'Login failed';
          set({ loginError: msg, loading: false });
          throw err;
        }
      },

      signOut: async () => {
        const s = get().session;
        if (s) {
          try {
            await authApi.logout(s.refreshToken);
          } catch {
            /* ignore — clear local state regardless */
          }
        }
        setAuthTokens(null, null);
        setStepUpToken(null, null);
        set({ session: null });
      },

      applyRefresh: (next) => {
        const cur = get().session;
        if (!cur) return;
        set({
          session: {
            ...cur,
            accessToken: next.accessToken,
            refreshToken: next.refreshToken,
            user: next.user,
          },
        });
      },

      setStepUp: (token, expiresAt) => {
        setStepUpToken(token, expiresAt);
      },

      clearStepUp: () => setStepUpToken(null, null),
    }),
    {
      name: 'neu-auth-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ session: s.session }),
    },
  ),
);

// Wire axios → store for refresh / logout side effects.
bindAuthSink({
  onLogout: () => useAuth.getState().signOut(),
  onRefreshed: (next) => useAuth.getState().applyRefresh(next),
});

// Re-prime axios with persisted tokens after rehydration.
useAuth.getState().hydrate();
