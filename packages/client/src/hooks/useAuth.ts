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
  | { status: 'anonymous'; userId: string }
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
          setAuthState({ status: 'anonymous', userId: profile.id });
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
      setAuthState({ status: 'anonymous', userId });
    } catch (e) {
      // Offline or server down — still allow app to load
      setAuthState({ status: 'anonymous', userId: '' });
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

  const logout = useCallback(async () => {
    clearAuthToken();
    // Revert to anonymous
    try {
      const { userId } = await fetchAnonymousToken();
      setAuthState({ status: 'anonymous', userId });
    } catch {
      setAuthState({ status: 'anonymous', userId: '' });
    }
  }, []);

  const isAuthenticated = authState.status === 'authenticated';
  const userId = authState.status !== 'loading' ? authState.userId : '';

  return { authState, isAuthenticated, userId, loginWithGoogle, logout, initialize };
}
