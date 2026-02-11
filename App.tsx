
import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { GameState } from './types';
import { PageTransition, ErrorBoundary } from './components/Shared';
import { MenuScreen, EnterNameScreen, JoinInputScreen, RulesScreen } from './screens/MenuFlow';
import { LobbyScreen, TeamSetupScreen, SettingsScreen } from './screens/LobbyFlow';
import { PreRoundScreen, PlayingScreen, RoundSummaryScreen, ScoreboardScreen, GameOverScreen, CountdownScreen } from './screens/GameFlow';
import { WifiOff, Loader2 } from 'lucide-react';
import { TRANSLATIONS } from './constants';

const ReconnectingOverlay = () => {
  const { isHostReconnecting, reconnectTimeLeft, settings } = useGame();
  const t = TRANSLATIONS[settings.language];
  if (!isHostReconnecting) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
      <div className="relative mb-8">
        <WifiOff size={64} className="text-red-500 animate-pulse" />
        <Loader2 size={84} className="text-white/20 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h2 className="text-3xl font-serif text-white mb-4 tracking-wide">{t.connectionLost}</h2>
      <p className="text-gray-400 font-light tracking-widest text-sm max-w-xs mb-8">
        {t.waitingReconnect}
      </p>
      <div className="bg-white/5 border border-white/10 px-6 py-2 rounded-full">
        <span className="text-white font-serif text-xl">{reconnectTimeLeft}s</span>
      </div>
    </div>
  );
};

const GameRouter = () => {
  const { gameState } = useGame();

  const renderContent = () => {
    switch (gameState) {
      case GameState.MENU: return <PageTransition key="menu"><MenuScreen /></PageTransition>;
      case GameState.RULES: return <PageTransition key="rules"><RulesScreen /></PageTransition>;
      case GameState.ENTER_NAME: return <PageTransition key="enter_name"><EnterNameScreen /></PageTransition>;
      case GameState.JOIN_INPUT: return <PageTransition key="join"><JoinInputScreen /></PageTransition>;
      case GameState.LOBBY: return <PageTransition key="lobby"><LobbyScreen /></PageTransition>;
      case GameState.SETTINGS: return <PageTransition key="settings"><SettingsScreen /></PageTransition>;
      case GameState.TEAMS: return <PageTransition key="teams"><TeamSetupScreen /></PageTransition>;
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
      <ReconnectingOverlay />
      <GameRouter />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
        <GameProvider>
          <AppContent />
        </GameProvider>
    </ErrorBoundary>
  );
};

export default App;
