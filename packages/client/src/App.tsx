import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import { GameState } from './types';
import { PageTransition } from './components/Shared';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
import { useTelegramApp } from './hooks/useTelegramApp';
import { useAuthContext } from './context/AuthContext';
import {
  MenuScreen,
  EnterNameScreen,
  JoinInputScreen,
  RulesScreen,
  ProfileScreen,
  ProfileSettingsScreen,
  LobbySettingsScreen,
  MyWordPacksScreen,
  StoreScreen,
  MyDecksScreen,
  PlayerStatsScreen,
} from './screens/MenuFlow';
import { LobbyScreen, TeamSetupScreen, SettingsScreen } from './screens/LobbyFlow';
import { GameFlow } from './screens/GameFlow';

const GameRouter = () => {
  const { gameState } = useGame();

  const renderContent = () => {
    switch (gameState) {
      case GameState.MENU:
        return (
          <PageTransition key="menu">
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
            <MyWordPacksScreen />
          </PageTransition>
        );
      case GameState.PLAYER_STATS:
        return (
          <PageTransition key="player_stats">
            <PlayerStatsScreen />
          </PageTransition>
        );
      case GameState.STORE:
        return (
          <PageTransition key="store">
            <StoreScreen />
          </PageTransition>
        );
      case GameState.MY_DECKS:
        return (
          <PageTransition key="my_decks">
            <MyDecksScreen />
          </PageTransition>
        );
      case GameState.RULES:
        return (
          <PageTransition key="rules">
            <RulesScreen />
          </PageTransition>
        );
      case GameState.ENTER_NAME:
        return (
          <PageTransition key="enter_name">
            <EnterNameScreen />
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
            <LobbyScreen />
          </PageTransition>
        );
      case GameState.SETTINGS:
        return (
          <PageTransition key="settings">
            <SettingsScreen />
          </PageTransition>
        );
      case GameState.TEAMS:
        return (
          <PageTransition key="teams">
            <TeamSetupScreen />
          </PageTransition>
        );
      case GameState.VS_SCREEN:
      case GameState.PRE_ROUND:
      case GameState.COUNTDOWN:
      case GameState.PLAYING:
      case GameState.ROUND_SUMMARY:
      case GameState.SCOREBOARD:
      case GameState.GAME_OVER:
        return <GameFlow key={gameState} />;
      default:
        return <MenuScreen />;
    }
  };

  return <>{renderContent()}</>;
};

const AppContent = () => {
  const { initData, isTelegram } = useTelegramApp();
  const { authState, isAuthenticated, loginWithTelegram } = useAuthContext();
  const { gameState, setGameState } = useGame();
  const [telegramLoginPending, setTelegramLoginPending] = React.useState(false);
  const attemptedRef = React.useRef(false);

  React.useEffect(() => {
    if (!isTelegram) return;
    if (!initData) return;
    if (isAuthenticated) return;
    if (attemptedRef.current) return;
    if (authState.status === 'loading') return;

    attemptedRef.current = true;
    setTelegramLoginPending(true);

    void loginWithTelegram(initData).finally(() => {
      setTelegramLoginPending(false);
    });
  }, [authState.status, initData, isAuthenticated, isTelegram, loginWithTelegram]);

  React.useEffect(() => {
    if (!isTelegram) return;
    const tg = window.Telegram?.WebApp;
    const back = tg?.BackButton;
    if (!back?.show || !back.hide || !back.onClick) return;

    const isMain = gameState === GameState.MENU;
    if (isMain) back.hide();
    else back.show();

    const onBack = () => {
      // Minimal "navigate(-1)" for our state-based router.
      switch (gameState) {
        case GameState.PROFILE_SETTINGS:
          setGameState(GameState.PROFILE);
          return;
        case GameState.LOBBY_SETTINGS:
          setGameState(GameState.LOBBY);
          return;
        case GameState.PLAYER_STATS:
          setGameState(isAuthenticated ? GameState.PROFILE : GameState.MENU);
          return;
        case GameState.SETTINGS:
        case GameState.TEAMS:
        case GameState.VS_SCREEN:
        case GameState.PRE_ROUND:
        case GameState.COUNTDOWN:
        case GameState.PLAYING:
        case GameState.ROUND_SUMMARY:
        case GameState.SCOREBOARD:
        case GameState.GAME_OVER:
          setGameState(GameState.LOBBY);
          return;
        default:
          setGameState(GameState.MENU);
      }
    };

    back.onClick(onBack);
    return () => {
      back.offClick?.(onBack);
    };
  }, [gameState, isAuthenticated, isTelegram, setGameState]);

  if (telegramLoginPending) {
    return (
      <div className="min-h-screen w-full bg-ui-bg text-ui-fg font-sans flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-ui-border bg-ui-surface px-5 py-4">
          <span className="w-5 h-5 border-2 border-ui-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-ui-fg-muted">Авторизація…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-ui-bg text-ui-fg font-sans selection:bg-ui-accent selection:text-ui-accent-contrast">
      <ConnectionStatusBanner />
      <PwaUpdateBanner />
      <GameRouter />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </AuthProvider>
  );
};

export default App;
