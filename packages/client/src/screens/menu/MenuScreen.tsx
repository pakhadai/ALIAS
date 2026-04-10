import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  User,
  Settings,
  BookOpen,
  WifiOff,
  Maximize,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  Logo,
  bottomSheetBackdropClass,
  bottomSheetPanelClass,
  ModalPortal,
} from '../../components/Shared';
import { ProfileModal } from '../../components/Auth/ProfileModal';
import { AppSettingsModal } from '../../components/Settings/AppSettingsModal';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';
import { toggleFullscreen, isStandaloneDisplay, isAppleMobile } from '../../utils/fullscreen';
import versionData from '../../version.json';
import { RulesModal } from './RulesScreen';
import { ROOM_CODE_LENGTH } from '../../constants';

export const MenuScreen = () => {
  const {
    setGameState,
    settings,
    setSettings,
    currentTheme,
    createNewRoom,
    startOfflineGame,
    connectionError,
    setRoomCode,
    checkRoomExists,
    showNotification,
  } = useGame();
  const { isAuthenticated } = useAuthContext();
  const [showRules, setShowRules] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [fullscreenHintVisible, setFullscreenHintVisible] = useState(false);
  const [showQuickJoin, setShowQuickJoin] = useState(false);
  const [quickJoinVisible, setQuickJoinVisible] = useState(false);
  const [quickJoinCode, setQuickJoinCode] = useState('');
  const [quickJoinChecking, setQuickJoinChecking] = useState(false);
  const t = useT();

  void setSettings;

  useEffect(() => {
    if (showFullscreenHint) {
      const r = requestAnimationFrame(() => setFullscreenHintVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setFullscreenHintVisible(false);
  }, [showFullscreenHint]);

  useEffect(() => {
    if (showQuickJoin) {
      const r = requestAnimationFrame(() => setQuickJoinVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setQuickJoinVisible(false);
  }, [showQuickJoin]);

  const closeFullscreenHint = () => {
    setFullscreenHintVisible(false);
    setTimeout(() => setShowFullscreenHint(false), 280);
  };

  const closeQuickJoin = () => {
    setQuickJoinVisible(false);
    setTimeout(() => setShowQuickJoin(false), 280);
  };

  // After sign-in inside the modal → close it and go to ProfileScreen
  useEffect(() => {
    if (isAuthenticated && showProfile) {
      setShowProfile(false);
      setGameState(GameState.PROFILE);
    }
  }, [isAuthenticated, showProfile, setGameState]);

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

  const showProfileBadge = !isAuthenticated;
  const canQuickJoin = quickJoinCode.length === ROOM_CODE_LENGTH && /^\d+$/.test(quickJoinCode);
  const quickJoinLabel = useMemo(() => t.joinGame, [t.joinGame]);

  const handleQuickJoin = async () => {
    if (!canQuickJoin || quickJoinChecking) return;
    setQuickJoinChecking(true);
    try {
      const exists = await checkRoomExists(quickJoinCode);
      if (!exists) {
        showNotification(t.roomNotFound.replace('{0}', quickJoinCode), 'error');
        return;
      }
      setRoomCode(quickJoinCode);
      setGameState(GameState.ENTER_NAME);
    } finally {
      setQuickJoinChecking(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-screen w-full ${currentTheme.bg} transition-colors duration-500 overflow-hidden`}
    >
      <header className="relative z-10 w-full px-6 md:px-8 pb-4 pt-safe-top flex justify-end items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={handleProfileClick}
          className={menuHeaderIconBtn}
          aria-label="Profile"
        >
          <span className="relative inline-flex">
            <User size={22} className={menuHeaderIcon} strokeWidth={1.75} />
            {showProfileBadge && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-(--ui-danger) ring-2 ring-(--ui-bg)"
                aria-hidden
              />
            )}
          </span>
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
              data-testid="menu-create-game"
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center transition-all active:scale-[0.98] shadow-2xl relative overflow-hidden`}
            >
              <span
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    'radial-gradient(70% 60% at 50% 0%, color-mix(in_srgb, var(--ui-accent) 28%, transparent) 0%, transparent 60%)',
                }}
                aria-hidden
              />
              <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">
                {t.createGame}
              </span>
            </button>
            <button
              onClick={() => setShowQuickJoin(true)}
              data-testid="menu-join-game"
              className="w-full h-14 rounded-full flex items-center justify-center transition-all active:scale-[0.98] bg-(--ui-surface) text-(--ui-fg) border border-(--ui-border) hover:bg-(--ui-surface-hover)"
            >
              <span className="font-sans font-bold text-[10px] uppercase tracking-[0.4em]">
                {quickJoinLabel}
              </span>
            </button>

            <button
              onClick={startOfflineGame}
              data-testid="menu-offline"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-(--ui-surface) border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-all active:scale-[0.98] w-full"
            >
              <WifiOff
                size={16}
                className={`${currentTheme.iconColor} opacity-70`}
                strokeWidth={2}
              />
              <span
                className={`font-sans font-bold text-[10px] uppercase tracking-[0.35em] opacity-80 ${currentTheme.textMain}`}
              >
                {t.playOffline}
              </span>
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 pt-4 pb-safe-bottom">
            <div className="h-px w-12 bg-(--ui-border)" />
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
        <ModalPortal>
          <div
            className={bottomSheetBackdropClass(fullscreenHintVisible, 'z-50')}
            onClick={closeFullscreenHint}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fullscreen-hint-title"
          >
            <div
              className={bottomSheetPanelClass(fullscreenHintVisible, 'px-5 pt-5 pb-safe-bottom-8')}
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
        </ModalPortal>
      )}

      {showQuickJoin && (
        <ModalPortal>
          <div
            className={bottomSheetBackdropClass(quickJoinVisible, 'z-50')}
            onClick={closeQuickJoin}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-join-title"
          >
            <div
              className={bottomSheetPanelClass(
                quickJoinVisible,
                'px-5 pt-5 pb-safe-bottom-8 max-w-sm'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pb-3">
                <div className="h-1 w-10 rounded-full bg-(--ui-border)" aria-hidden />
              </div>

              <div className="flex justify-between items-start mb-4">
                <p
                  id="quick-join-title"
                  className="text-(--ui-fg) text-sm font-sans font-semibold tracking-wide pr-4"
                >
                  {t.enterCode}
                </p>
                <button
                  type="button"
                  onClick={closeQuickJoin}
                  className="text-(--ui-fg-muted) hover:text-(--ui-fg) p-1 shrink-0"
                  aria-label={t.close}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="rounded-3xl bg-(--ui-surface) border border-(--ui-border) px-4 py-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quickJoinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= ROOM_CODE_LENGTH) setQuickJoinCode(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleQuickJoin();
                    }}
                    placeholder="00000"
                    data-testid="menu-quick-join-code"
                    className="flex-1 bg-transparent text-(--ui-fg) font-sans font-bold tracking-[0.25em] text-[12px] px-2 py-2 outline-none placeholder:text-(--ui-fg-muted)"
                    aria-label={t.enterCode}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleQuickJoin()}
                    disabled={!canQuickJoin || quickJoinChecking}
                    data-testid="menu-quick-join-submit"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-(--ui-accent) text-(--ui-accent-contrast) transition-all active:scale-95 disabled:opacity-40"
                    aria-label={t.enter}
                  >
                    {quickJoinChecking ? (
                      <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    ) : (
                      <ArrowRight size={18} strokeWidth={2.5} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={closeQuickJoin}
                className={`mt-4 w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest bg-(--ui-surface) text-(--ui-fg) border border-(--ui-border) hover:bg-(--ui-surface-hover) transition-all active:scale-[0.98]`}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showAppSettings && <AppSettingsModal onClose={() => setShowAppSettings(false)} />}
    </div>
  );
};
