import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { LoginModal } from '../components/Auth/LoginModal';
import { useTelegramApp } from '../hooks/useTelegramApp';
import { GameState } from '../types';
import { useAuthContext } from './AuthContext';
import { useGame } from './GameContext';

const SESSION_DISMISSED_KEY = 'alias_login_dismissed';

interface AppLoginContextType {
  /** Re-open the app login sheet (e.g. from profile or gated features). */
  requestLogin: () => void;
}

const AppLoginContext = createContext<AppLoginContextType | null>(null);

function readSessionDismissed(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(SESSION_DISMISSED_KEY) === '1';
}

export function AppLoginProvider({ children }: { children: React.ReactNode }) {
  const { authState } = useAuthContext();
  const { isTelegram } = useTelegramApp();
  const { gameState } = useGame();
  const [dismissed, setDismissed] = useState(readSessionDismissed);
  const [forced, setForced] = useState(false);

  const requestLogin = useCallback(() => {
    setForced(true);
    setDismissed(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setForced(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_DISMISSED_KEY, '1');
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  // Gate login to the main menu only — overlay blocks offline / join flows on other screens.
  const showLogin =
    gameState === GameState.MENU &&
    !isTelegram &&
    authState.status === 'anonymous' &&
    (!dismissed || forced);

  const value = useMemo(() => ({ requestLogin }), [requestLogin]);

  return (
    <AppLoginContext.Provider value={value}>
      {children}
      <LoginModal open={showLogin} onDismiss={handleDismiss} />
    </AppLoginContext.Provider>
  );
}

export function useAppLogin(): AppLoginContextType {
  const ctx = useContext(AppLoginContext);
  if (!ctx) throw new Error('useAppLogin must be used within AppLoginProvider');
  return ctx;
}
