import React, { Suspense } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import { GameState } from './types';
import { PageTransition } from './components/Shared';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
import { TelegramAuthLoadingScreen } from './components/TelegramAuthLoadingScreen';
import { useTelegramApp } from './hooks/useTelegramApp';
import { applyGlassTheme } from './lib/glassTheme';
import { useAuthContext } from './context/AuthContext';
import { useTelegramLobbyDeepLink } from './hooks/useTelegramLobbyDeepLink';
import { useTelegramBackButton } from './hooks/useTelegramBackButton';
import { AppLoginProvider } from './context/AppLoginContext';
import { BackNavigationGuardProvider } from './context/BackNavigationGuardContext';
import { LobbyExitProvider } from './context/LobbyExitContext';
import { ScreenShell } from './components/layout/ScreenShell';
import { typographyClass } from './constants/typography';
import {
  MenuScreen,
  JoinInputScreen,
  ProfileScreen,
  ProfileSettingsScreen,
  LobbySettingsScreen,
} from './screens/MenuFlow';
const GameFlow = React.lazy(() =>
  import('./screens/GameFlow').then((mod) => ({ default: mod.GameFlow }))
);
const LobbyScreen = React.lazy(() =>
  import('./screens/lobby/LobbyScreen').then((mod) => ({ default: mod.LobbyScreen }))
);
const TeamSetupScreen = React.lazy(() =>
  import('./screens/lobby/TeamSetupScreen').then((mod) => ({ default: mod.TeamSetupScreen }))
);
const SettingsScreen = React.lazy(() =>
  import('./screens/lobby/SettingsScreen').then((mod) => ({ default: mod.SettingsScreen }))
);
const MyWordPacksScreen = React.lazy(() =>
  import('./screens/menu/MyWordPacksScreen').then((mod) => ({ default: mod.MyWordPacksScreen }))
);
const StoreScreen = React.lazy(() =>
  import('./screens/menu/StoreScreen').then((mod) => ({ default: mod.StoreScreen }))
);
const MyDecksScreen = React.lazy(() =>
  import('./screens/menu/MyDecksScreen').then((mod) => ({ default: mod.MyDecksScreen }))
);
const PlayerStatsScreen = React.lazy(() =>
  import('./screens/menu/PlayerStatsScreen').then((mod) => ({ default: mod.PlayerStatsScreen }))
);
const RulesScreen = React.lazy(() =>
  import('./screens/menu/RulesScreen').then((mod) => ({ default: mod.RulesScreen }))
);

/** Suspense placeholder — same viewport + safe-area padding as {@link ScreenShell} without chrome. */
const LazyRouteFallback = () => (
  <ScreenShell contentClassName="flex flex-1 items-center justify-center px-6">
    <p className={`${typographyClass.body} text-ui-fg-muted`}>Завантаження…</p>
  </ScreenShell>
);

const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LazyRouteFallback />}>{children}</Suspense>
);

const GameRouter = () => {
  const { gameState } = useGame();

  const renderContent = () => {
    switch (gameState) {
      case GameState.MENU:
      case GameState.ENTER_NAME:
        return (
          <PageTransition key="menu_canvas">
            <MenuScreen />
          </PageTransition>
        );
      case GameState.PROFILE:
        return (
          <PageTransition key="profile">
            <ProfileScreen />
          </PageTransition>
        );
      case GameState.PROFILE_SETTINGS:
        return (
          <PageTransition key="profile_settings">
            <ProfileSettingsScreen />
          </PageTransition>
        );
      case GameState.LOBBY_SETTINGS:
        return (
          <PageTransition key="lobby_settings">
            <LobbySettingsScreen />
          </PageTransition>
        );
      case GameState.MY_WORD_PACKS:
        return (
          <PageTransition key="my_word_packs">
            <LazyRoute>
              <MyWordPacksScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.PLAYER_STATS:
        return (
          <PageTransition key="player_stats">
            <LazyRoute>
              <PlayerStatsScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.STORE:
        return (
          <PageTransition key="store">
            <LazyRoute>
              <StoreScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.MY_DECKS:
        return (
          <PageTransition key="my_decks">
            <LazyRoute>
              <MyDecksScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.RULES:
        return (
          <PageTransition key="rules">
            <LazyRoute>
              <RulesScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.JOIN_INPUT:
        return (
          <PageTransition key="join">
            <JoinInputScreen />
          </PageTransition>
        );
      case GameState.LOBBY:
        return (
          <PageTransition key="lobby">
            <LazyRoute>
              <LobbyScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.SETTINGS:
        return (
          <PageTransition key="settings">
            <LazyRoute>
              <SettingsScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.TEAMS:
        return (
          <PageTransition key="teams">
            <LazyRoute>
              <TeamSetupScreen />
            </LazyRoute>
          </PageTransition>
        );
      case GameState.VS_SCREEN:
      case GameState.PRE_ROUND:
      case GameState.COUNTDOWN:
      case GameState.PLAYING:
      case GameState.ROUND_SUMMARY:
      case GameState.SCOREBOARD:
      case GameState.GAME_OVER:
        return (
          <LazyRoute key={gameState}>
            <GameFlow />
          </LazyRoute>
        );
      default:
        return <MenuScreen />;
    }
  };

  return <>{renderContent()}</>;
};

/**
 * Telegram Mini App: run login before GameProvider so sockets / rejoin never use a stale anonymous JWT.
 */
const TelegramAuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initData, isTelegram } = useTelegramApp();
  const { authState, isAuthenticated, loginWithTelegram } = useAuthContext();
  const attemptedRef = React.useRef(false);
  const [telegramAuthRetryNonce, setTelegramAuthRetryNonce] = React.useState(0);

  React.useEffect(() => {
    if (!isTelegram) return;
    if (!initData) return;
    if (isAuthenticated) return;
    if (attemptedRef.current) return;
    if (authState.status === 'loading') return;

    attemptedRef.current = true;

    if (import.meta.env.DEV) {
      console.warn('[TelegramAuth] attempting telegram login', {
        initDataLength: initData.length,
        authState: authState.status,
      });
    }

    void loginWithTelegram(initData);
  }, [
    authState.status,
    initData,
    isAuthenticated,
    isTelegram,
    loginWithTelegram,
    telegramAuthRetryNonce,
  ]);

  const telegramMiniAppBlocking =
    isTelegram && Boolean(initData) && !isAuthenticated && authState.status !== 'error';

  if (telegramMiniAppBlocking) {
    return <TelegramAuthLoadingScreen />;
  }

  if (isTelegram && !isAuthenticated && authState.status === 'error') {
    return (
      <div className="min-h-screen w-full bg-ui-bg text-ui-fg font-sans flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-ui-border bg-ui-surface p-5">
          <div className={`${typographyClass.system} font-semibold`}>
            Не вдалося авторизуватись у Telegram
          </div>
          <div className={`mt-2 ${typographyClass.body} text-ui-fg-muted wrap-break-word`}>
            {authState.message}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className={`inline-flex items-center justify-center rounded-xl bg-ui-accent px-4 py-2 ${typographyClass.label} font-semibold text-ui-accent-contrast`}
              onClick={() => {
                attemptedRef.current = false;
                setTelegramAuthRetryNonce((n) => n + 1);
              }}
            >
              Повторити спробу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { isTelegram, startParam } = useTelegramApp();

  React.useEffect(() => {
    if (isTelegram) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      applyGlassTheme(media.matches ? 'dark' : 'light');
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [isTelegram]);
  const { isAuthenticated } = useAuthContext();
  const {
    gameState,
    gameMode,
    uiLanguage,
    setGameState,
    setRoomCode,
    roomCode,
    checkRoomExists,
    showNotification,
    leaveRoom,
  } = useGame();

  useTelegramLobbyDeepLink({
    isAuthenticated,
    startParam,
    gameState,
    uiLanguage,
    setGameState,
    setRoomCode,
    checkRoomExists,
    showNotification,
  });

  useTelegramBackButton({
    isTelegram,
    isAuthenticated,
    gameState,
    gameMode,
    roomCode,
    setGameState,
    leaveRoom,
  });

  return (
    <AppLoginProvider>
      <div className="min-h-0 h-[var(--tg-viewport-height,100dvh)] max-h-[var(--tg-viewport-height,100dvh)] w-full overflow-x-hidden bg-ui-bg text-ui-fg font-sans selection:bg-ui-accent selection:text-ui-accent-contrast">
        <ConnectionStatusBanner />
        <PwaUpdateBanner />
        <GameRouter />
      </div>
    </AppLoginProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <TelegramAuthBootstrap>
        <GameProvider>
          <BackNavigationGuardProvider>
            <LobbyExitProvider>
              <AppContent />
            </LobbyExitProvider>
          </BackNavigationGuardProvider>
        </GameProvider>
      </TelegramAuthBootstrap>
    </AuthProvider>
  );
};

export default App;
