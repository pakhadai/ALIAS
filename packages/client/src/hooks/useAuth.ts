import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  fetchAnonymousToken,
  signInWithGoogle,
  fetchProfile,
  getAuthToken,
  clearAuthToken,
  type UserProfile,
} from '../services/api';
import { migrateLegacyPlayerStatsOnce, syncPlayerStatsFromProfile } from './usePlayerStats';

async function hydratePlayerStats(profile: UserProfile) {
  syncPlayerStatsFromProfile(profile);
  await migrateLegacyPlayerStatsOnce();
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; userId: string; profile: UserProfile | null }
  | {
      status: 'authenticated';
      userId: string;
      email: string;
      provider: string;
      isAdmin: boolean;
      profile: UserProfile;
    }
  | { status: 'error'; message: string };

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  /** Initialize: if JWT exists, load profile; otherwise get anonymous token */
  const initialize = useCallback(async () => {
    const existingToken = getAuthToken();
    if (existingToken) {
      try {
        const profile = await fetchProfile();
        await hydratePlayerStats(profile);
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
      await hydratePlayerStats(profile);
      setAuthState({ status: 'anonymous', userId, profile });
    } catch (_e) {
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
      await hydratePlayerStats(profile);
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
      const profile = await fetchProfile();
      await hydratePlayerStats(profile);
      setAuthState({ status: 'anonymous', userId, profile });
    } catch {
      setAuthState({ status: 'anonymous', userId: '', profile: null });
    }
  }, []);

  /** Refresh profile (e.g. after update) — avoids duplicate fetches across screens */
  const refreshProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      await hydratePlayerStats(profile);
      setAuthState((prev) => {
        if (prev.status === 'anonymous') return { ...prev, profile };
        if (prev.status === 'authenticated') {
          return { ...prev, profile, isAdmin: profile.isAdmin ?? false };
        }
        return prev;
      });
      return profile;
    } catch {
      return null;
    }
  }, []);

  const isAuthenticated = authState.status === 'authenticated';
  const userId =
    authState.status === 'anonymous' || authState.status === 'authenticated'
      ? authState.userId
      : '';
  const profile =
    authState.status === 'anonymous'
      ? authState.profile
      : authState.status === 'authenticated'
        ? authState.profile
        : null;

  return useMemo(
    () => ({
      authState,
      isAuthenticated,
      userId,
      profile,
      refreshProfile,
      loginWithGoogle,
      logout,
      initialize,
    }),
    [
      authState,
      isAuthenticated,
      userId,
      profile,
      refreshProfile,
      loginWithGoogle,
      logout,
      initialize,
    ]
  );
}
