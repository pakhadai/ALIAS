import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import { GameState } from './types';
import { PageTransition } from './components/Shared';
import { ConnectionStatusBanner } from './components/ConnectionStatusBanner';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
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
  const { currentTheme } = useGame();

  return (
    <div
      className={`min-h-screen w-full ${currentTheme.bg} text-(--ui-fg) font-sans selection:bg-(--ui-accent) selection:text-(--ui-accent-contrast) transition-colors duration-500`}
    >
      <ConnectionStatusBanner />
      <PwaUpdateBanner />
      <GameRouter />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
