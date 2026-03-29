import { useState, useCallback, useEffect } from 'react';
import {
  fetchAnonymousToken,
  signInWithGoogle,
  fetchProfile,
  getAuthToken,
  clearAuthToken,
  type UserProfile,
} from '../services/api';

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; userId: string; profile: UserProfile | null }
  | { status: 'authenticated'; userId: string; email: string; provider: string; isAdmin: boolean; profile: UserProfile }
  | { status: 'error'; message: string };

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  /** Initialize: if JWT exists, load profile; otherwise get anonymous token */
  const initialize = useCallback(async () => {
    const existingToken = getAuthToken();
    if (existingToken) {
      try {
        const profile = await fetchProfile();
        if (profile.authProvider === 'anonymous') {
          setAuthState({ status: 'anonymous', userId: profile.id, profile });
        } else {
          setAuthState({
            status: 'authenticated',
            userId: profile.id,
            email: profile.email || '',
            provider: profile.authProvider,
            isAdmin: profile.isAdmin ?? false,
            profile,
          });
        }
        return;
      } catch {
        // Token expired or invalid, fall through to anonymous
        clearAuthToken();
      }
    }

    // Get anonymous token (no account required)
    try {
      const { userId } = await fetchAnonymousToken();
      const profile = await fetchProfile();
      setAuthState({ status: 'anonymous', userId, profile });
    } catch (e) {
      // Offline or server down — still allow app to load
      setAuthState({ status: 'anonymous', userId: '', profile: null });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const { userId, email } = await signInWithGoogle(idToken);
      const profile = await fetchProfile();
      setAuthState({
        status: 'authenticated',
        userId,
        email: email || '',
        provider: 'google',
        isAdmin: profile.isAdmin ?? false,
        profile,
      });
    } catch (e) {
      setAuthState({ status: 'error', message: (e as Error).message });
    }
  }, []);

  /** Apple Sign In — бекенд поки не підтримує. Кидає помилку, щоб LoginModal її показав. */
  const loginWithApple = useCallback(async (_idToken: string, _email?: string) => {
    throw new Error('Apple Sign In ще не налаштовано. Використовуйте Google.');
  }, []);

  const logout = useCallback(async () => {
    clearAuthToken();
    // Revert to anonymous
    try {
      const { userId } = await fetchAnonymousToken();
      const profile = await fetchProfile();
      setAuthState({ status: 'anonymous', userId, profile });
    } catch {
      setAuthState({ status: 'anonymous', userId: '', profile: null });
    }
  }, []);

  /** Refresh profile (e.g. after update) — avoids duplicate fetches across screens */
  const refreshProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      setAuthState(prev => {
        if (prev.status === 'anonymous') return { ...prev, profile };
        if (prev.status === 'authenticated') return { ...prev, profile };
        return prev;
      });
      return profile;
    } catch {
      return null;
    }
  }, []);

  const isAuthenticated = authState.status === 'authenticated';
  const userId = authState.status !== 'loading' ? authState.userId : '';
  const profile = authState.status === 'anonymous' ? authState.profile : authState.status === 'authenticated' ? authState.profile : null;

  return { authState, isAuthenticated, userId, profile, refreshProfile, loginWithGoogle, loginWithApple, logout, initialize };
}
