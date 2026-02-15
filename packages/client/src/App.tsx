
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GameProvider, useGame } from './context/GameContext';
import { AuthProvider } from './context/AuthContext';
import { GameState } from './types';
import { PageTransition, ErrorBoundary } from './components/Shared';
import { MenuScreen, EnterNameScreen, JoinInputScreen, RulesScreen, ProfileScreen, StoreScreen, MyDecksScreen } from './screens/MenuFlow';
import { LobbyScreen, TeamSetupScreen, SettingsScreen } from './screens/LobbyFlow';
import { VSScreen, PreRoundScreen, PlayingScreen, RoundSummaryScreen, ScoreboardScreen, GameOverScreen, CountdownScreen } from './screens/GameFlow';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GameRouter = () => {
  const { gameState } = useGame();

  const renderContent = () => {
    switch (gameState) {
      case GameState.MENU: return <PageTransition key="menu"><MenuScreen /></PageTransition>;
      case GameState.PROFILE: return <PageTransition key="profile"><ProfileScreen /></PageTransition>;
      case GameState.STORE: return <PageTransition key="store"><StoreScreen /></PageTransition>;
      case GameState.MY_DECKS: return <PageTransition key="my_decks"><MyDecksScreen /></PageTransition>;
      case GameState.RULES: return <PageTransition key="rules"><RulesScreen /></PageTransition>;
      case GameState.ENTER_NAME: return <PageTransition key="enter_name"><EnterNameScreen /></PageTransition>;
      case GameState.JOIN_INPUT: return <PageTransition key="join"><JoinInputScreen /></PageTransition>;
      case GameState.LOBBY: return <PageTransition key="lobby"><LobbyScreen /></PageTransition>;
      case GameState.SETTINGS: return <PageTransition key="settings"><SettingsScreen /></PageTransition>;
      case GameState.TEAMS: return <PageTransition key="teams"><TeamSetupScreen /></PageTransition>;
      case GameState.VS_SCREEN: return <PageTransition key="vs"><VSScreen /></PageTransition>;
      case GameState.PRE_ROUND: return <PageTransition key="pre_round"><PreRoundScreen /></PageTransition>;
      case GameState.COUNTDOWN: return <div key="countdown" className="animate-fade-in"><CountdownScreen /></div>;
      case GameState.PLAYING: return <div key="playing" className="animate-fade-in"><PlayingScreen /></div>;
      case GameState.ROUND_SUMMARY: return <PageTransition key="summary"><RoundSummaryScreen /></PageTransition>;
      case GameState.SCOREBOARD: return <PageTransition key="scoreboard"><ScoreboardScreen /></PageTransition>;
      case GameState.GAME_OVER: return <PageTransition key="gameover"><GameOverScreen /></PageTransition>;
      default: return <MenuScreen />;
    }
  };

  return <>{renderContent()}</>;
};

const AppContent = () => {
  const { currentTheme } = useGame();
  const baseTextColor = currentTheme.id === 'PREMIUM_LIGHT' ? 'text-slate-900' : 'text-white';

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${baseTextColor} font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-500`}>
      <GameRouter />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <GameProvider>
            <AppContent />
          </GameProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
};

export default App;
