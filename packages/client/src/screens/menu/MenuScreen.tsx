import React, { useState, useEffect } from 'react';
import { AlertCircle, User, Settings, BookOpen, WifiOff, Maximize, X } from 'lucide-react';
import { Logo, bottomSheetBackdropClass, bottomSheetPanelClass } from '../../components/Shared';
import { ProfileModal } from '../../components/Auth/ProfileModal';
import { AppSettingsModal } from '../../components/Settings/AppSettingsModal';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';
import { toggleFullscreen, isStandaloneDisplay, isAppleMobile } from '../../utils/fullscreen';
import versionData from '../../version.json';
import { RulesModal } from './RulesScreen';

export const MenuScreen = () => {
  const {
    setGameState,
    settings,
    setSettings,
    currentTheme,
    createNewRoom,
    startOfflineGame,
    connectionError,
  } = useGame();
  const { isAuthenticated } = useAuthContext();
  const [showRules, setShowRules] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [fullscreenHintVisible, setFullscreenHintVisible] = useState(false);
  const t = useT();

  void setSettings;

  useEffect(() => {
    if (showFullscreenHint) {
      const r = requestAnimationFrame(() => setFullscreenHintVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setFullscreenHintVisible(false);
  }, [showFullscreenHint]);

  const closeFullscreenHint = () => {
    setFullscreenHintVisible(false);
    setTimeout(() => setShowFullscreenHint(false), 280);
  };

  // After sign-in inside the modal → close it and go to ProfileScreen
  useEffect(() => {
    if (isAuthenticated && showProfile) {
      setShowProfile(false);
      setGameState(GameState.PROFILE);
    }
  }, [isAuthenticated]);

  const handleProfileClick = () => {
    if (isAuthenticated) {
      setGameState(GameState.PROFILE);
    } else {
      setShowProfile(true);
    }
  };

  const handleFullscreenClick = async () => {
    if (isStandaloneDisplay()) return;
    const result = await toggleFullscreen();
    if (result === 'unsupported') {
      setShowFullscreenHint(true);
      return;
    }
    if (result === 'error' && isAppleMobile()) {
      setShowFullscreenHint(true);
    }
  };

  const menuHeaderIconBtn =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all active:scale-90';
  const menuHeaderIcon = `${currentTheme.iconColor} opacity-50 hover:opacity-100 transition-opacity`;

  return (
    <div
      className={`flex flex-col h-screen w-full ${currentTheme.bg} transition-colors duration-500 overflow-hidden`}
    >
      <header
        className="relative z-10 w-full px-6 md:px-8 pb-4 flex justify-end items-center gap-2 sm:gap-3 shrink-0"
        style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={handleProfileClick}
          className={menuHeaderIconBtn}
          aria-label="Profile"
        >
          <User size={22} className={menuHeaderIcon} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setShowAppSettings(true)}
          className={menuHeaderIconBtn}
          aria-label="Settings"
        >
          <Settings size={22} className={menuHeaderIcon} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => setShowRules(true)}
          className={menuHeaderIconBtn}
          aria-label={t.rulesTitle}
        >
          <BookOpen size={22} className={menuHeaderIcon} strokeWidth={1.75} />
        </button>
        {!isStandaloneDisplay() && (
          <button
            type="button"
            onClick={() => void handleFullscreenClick()}
            className={menuHeaderIconBtn}
            aria-label="Fullscreen"
          >
            <Maximize size={22} className={menuHeaderIcon} strokeWidth={1.75} />
          </button>
        )}
      </header>

      <div className="max-w-2xl w-full flex-1 flex flex-col items-center mx-auto">
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-xs px-6 md:px-8 pb-20">
          <Logo theme={currentTheme} />

          {connectionError && (
            <div className="mt-8 p-4 bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)] rounded-2xl flex items-center gap-4 animate-shake">
              <AlertCircle className="text-(--ui-danger)" size={20} />
              <p className="text-[10px] uppercase tracking-widest text-(--ui-danger) font-bold">
                Server Error: {connectionError}
              </p>
            </div>
          )}

          <div className="w-full space-y-6 flex flex-col items-center mt-12 animate-slide-up">
            <button
              onClick={createNewRoom}
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center transition-all active:scale-[0.98] shadow-2xl`}
            >
              <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">
                {t.createGame}
              </span>
            </button>
            <button
              onClick={() => setGameState(GameState.JOIN_INPUT)}
              className="w-full h-14 rounded-full flex items-center justify-center transition-all active:scale-[0.98] bg-(--ui-surface) text-(--ui-fg) border border-(--ui-border) hover:bg-(--ui-surface-hover)"
            >
              <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">
                {t.joinGame}
              </span>
            </button>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 pb-6 pt-4"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="h-px w-12 bg-(--ui-border)" />
            <button onClick={startOfflineGame} className="inline-flex items-center gap-2 group h-6">
              <WifiOff
                size={14}
                className={`shrink-0 ${currentTheme.iconColor} opacity-40 group-hover:opacity-100 transition-opacity`}
                strokeWidth={2}
              />
              <span
                className={`font-sans font-medium text-[9px] uppercase tracking-[0.5em] border-b border-transparent group-hover:border-current pb-2 transition-all opacity-30 group-hover:opacity-100 leading-none ${currentTheme.textMain}`}
              >
                {t.playOffline}
              </span>
            </button>
            <span
              className={`font-sans text-[8px] uppercase tracking-widest opacity-20 ${currentTheme.textMain}`}
            >
              v{versionData.version}
            </span>
          </div>
        </main>
      </div>

      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        t={t}
        currentTheme={currentTheme}
        settings={settings}
      />

      {showFullscreenHint && (
        <div
          className={bottomSheetBackdropClass(fullscreenHintVisible, 'z-50')}
          onClick={closeFullscreenHint}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fullscreen-hint-title"
        >
          <div
            className={bottomSheetPanelClass(fullscreenHintVisible, 'px-5 pt-5 pb-8')}
            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pb-3">
              <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
            </div>
            <div className="flex justify-between items-start mb-4">
              <p
                id="fullscreen-hint-title"
                className="text-(--ui-fg) text-sm font-sans font-semibold tracking-wide pr-4"
              >
                {t.fullscreenUnavailableTitle}
              </p>
              <button
                type="button"
                onClick={closeFullscreenHint}
                className="text-(--ui-fg-muted) hover:text-(--ui-fg) p-1 shrink-0"
                aria-label={t.close}
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-(--ui-fg-muted) text-sm leading-relaxed font-sans mb-6">
              {t.fullscreenUnavailableBody}
            </p>
            <button
              type="button"
              onClick={closeFullscreenHint}
              className={`w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest ${currentTheme.button}`}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showAppSettings && <AppSettingsModal onClose={() => setShowAppSettings(false)} />}
    </div>
  );
};
