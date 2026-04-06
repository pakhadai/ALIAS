import React, { createContext, useContext } from 'react';
import { useAuth, type AuthState } from '../hooks/useAuth';

interface AuthContextType {
  authState: AuthState;
  isAuthenticated: boolean;
  userId: string;
  /** Profile from auth (anonymous or authenticated) — use this instead of fetchProfile */
  profile: import('../services/api').UserProfile | null;
  /** Refresh profile after update — call after updateProfile/save */
  refreshProfile: () => Promise<import('../services/api').UserProfile | null>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
