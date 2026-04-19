import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, User, Settings, BookOpen, WifiOff, Maximize, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Shared';
import { ModalSheet } from '../../components/ModalSheet';
import { AppSettingsModal } from '../../components/Settings/AppSettingsModal';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';
import {
  keyboardAvoidingBottomPadding,
  scrollElementIntoViewCentered,
  useVisualViewportBottomInset,
} from '../../hooks/useVisualViewportBottomInset';
import { toggleFullscreen, isStandaloneDisplay, isAppleMobile } from '../../utils/fullscreen';
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
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [fullscreenHintVisible, setFullscreenHintVisible] = useState(false);
  const [showQuickJoin, setShowQuickJoin] = useState(false);
  const [quickJoinVisible, setQuickJoinVisible] = useState(false);
  const [quickJoinCode, setQuickJoinCode] = useState('');
  const [quickJoinChecking, setQuickJoinChecking] = useState(false);
  const [createRoomBusy, setCreateRoomBusy] = useState(false);
  const t = useT();
  const keyboardBottomInset = useVisualViewportBottomInset();

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
    setTimeout(() => setShowFullscreenHint(false), 300);
  };

  const closeQuickJoin = () => {
    setQuickJoinVisible(false);
    setTimeout(() => setShowQuickJoin(false), 300);
  };

  const handleProfileClick = () => {
    setGameState(GameState.PROFILE);
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

  const menuHeaderIconBtn = [
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
    'transition-all duration-150 ease-out',
    'active:scale-90 active:bg-ui-surface',
  ].join(' ');
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

  const handleCreateRoom = async () => {
    if (createRoomBusy) return;
    setCreateRoomBusy(true);
    try {
      await createNewRoom();
    } finally {
      setCreateRoomBusy(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col h-screen w-full ${currentTheme.bg} transition-colors duration-500 overflow-hidden`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 15%, var(--ui-accent) 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(var(--ui-fg) 0.5px, transparent 0.5px)',
          backgroundSize: '18px 18px',
        }}
      />
      <header
        className={[
          'fixed left-0 right-0 top-0 z-20',
          'flex justify-end items-center gap-2 sm:gap-3',
          'px-4 pb-3',
          'pt-[max(var(--tg-content-safe-area-inset-top,0px),var(--tg-safe-area-inset-top,0px),env(safe-area-inset-top,0px),10px)]',
          'backdrop-blur-xl',
          'bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--ui-bg)_92%,transparent)_0%,color-mix(in_srgb,var(--ui-bg)_65%,transparent)_60%,transparent_100%)]',
        ].join(' ')}
      >
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
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ui-danger ring-2 ring-ui-bg"
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
        <div
          className="w-full shrink-0"
          style={{
            height:
              'calc(max(var(--tg-content-safe-area-inset-top, 0px), var(--tg-safe-area-inset-top, 0px), env(safe-area-inset-top, 0px), 10px) + 56px)',
          }}
          aria-hidden
        />
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-xs px-6 md:px-8 pb-20">
          <div className="scale-[0.85] origin-top">
            <Logo theme={currentTheme} />
          </div>

          {connectionError && (
            <div className="mt-8 p-4 bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)] rounded-2xl flex items-center gap-4 animate-shake">
              <AlertCircle className="text-ui-danger" size={20} />
              <p className="text-xs uppercase tracking-wide text-ui-danger font-bold">
                Server Error: {connectionError}
              </p>
            </div>
          )}

          <div className="w-full space-y-3 flex flex-col items-center mt-10 animate-slide-up">
            <button
              type="button"
              onClick={() => void handleCreateRoom()}
              disabled={createRoomBusy}
              data-testid="menu-create-game"
              className={`w-full h-14 ${currentTheme.button} rounded-full flex items-center justify-center gap-2 transition-all duration-200 ease-out active:scale-[0.98] shadow-2xl relative overflow-hidden disabled:opacity-70 disabled:pointer-events-none`}
            >
              <span
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    'radial-gradient(70% 60% at 50% 0%, color-mix(in_srgb, var(--ui-accent) 28%, transparent) 0%, transparent 60%)',
                }}
                aria-hidden
              />
              {createRoomBusy ? (
                <span className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
              ) : null}
              <span className="font-sans font-bold text-sm uppercase tracking-wide">
                {t.createGame}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickJoin(true)}
              data-testid="menu-join-game"
              className="w-full h-14 rounded-full flex items-center justify-center transition-all duration-200 ease-out active:scale-[0.98] bg-ui-surface text-ui-fg border border-ui-border hover:bg-ui-surface-hover"
            >
              <span className="font-sans font-bold text-sm uppercase tracking-wide">
                {quickJoinLabel}
              </span>
            </button>

            <div className="flex items-center gap-3 w-full opacity-20 py-1">
              <div className="h-px flex-1 bg-ui-border" />
              <span className="text-[9px] uppercase tracking-widest text-ui-fg-muted shrink-0">
                {t.menuOrDivider}
              </span>
              <div className="h-px flex-1 bg-ui-border" />
            </div>

            <button
              type="button"
              onClick={startOfflineGame}
              data-testid="menu-offline"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ui-border bg-transparent text-ui-fg-muted text-xs font-sans font-bold uppercase tracking-wide transition-all duration-200 ease-out active:scale-[0.98] hover:bg-ui-surface/40 hover:text-ui-fg"
            >
              <WifiOff size={14} className="opacity-80 shrink-0" strokeWidth={2} />
              <span>{t.playOffline}</span>
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pt-4 pb-safe-bottom">
            <div className="flex items-center gap-2 opacity-25">
              <div className="h-px w-6 bg-ui-border" />
              <span className="text-[8px] font-mono tracking-widest text-ui-fg-muted">
                v{__APP_VERSION__}
              </span>
              <div className="h-px w-6 bg-ui-border" />
            </div>
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
        <ModalSheet
          open={fullscreenHintVisible}
          onClose={closeFullscreenHint}
          showHandle
          showClose
          closeAriaLabel={t.close}
          paddedContent={false}
          panelClassName="px-5 pt-0 pb-safe-bottom-8"
          ariaLabelledBy="fullscreen-hint-title"
        >
          <p
            id="fullscreen-hint-title"
            className="text-ui-fg text-sm font-sans font-semibold tracking-wide pr-12 mb-4"
          >
            {t.fullscreenUnavailableTitle}
          </p>
          <p className="text-ui-fg-muted text-sm leading-relaxed font-sans mb-6">
            {t.fullscreenUnavailableBody}
          </p>
          <button
            type="button"
            onClick={closeFullscreenHint}
            className={`w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest transition-all duration-200 ease-out active:scale-[0.98] ${currentTheme.button}`}
          >
            {t.close}
          </button>
        </ModalSheet>
      )}

      {showQuickJoin && (
        <ModalSheet
          open={quickJoinVisible}
          onClose={closeQuickJoin}
          maxWidth="sm"
          showHandle
          showClose
          closeAriaLabel={t.close}
          paddedContent={false}
          panelClassName="px-5 pt-0 pb-safe-bottom-8"
          backdropStyle={keyboardAvoidingBottomPadding(keyboardBottomInset)}
          ariaLabelledBy="quick-join-title"
        >
          <p
            id="quick-join-title"
            className="text-ui-fg text-sm font-sans font-semibold tracking-wide pr-12 mb-4"
          >
            {t.enterCode}
          </p>

          <div className="rounded-3xl bg-ui-surface border border-ui-border px-4 py-3 transition-colors duration-200">
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                value={quickJoinCode}
                onFocus={(e) => scrollElementIntoViewCentered(e.currentTarget)}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (val.length <= ROOM_CODE_LENGTH) setQuickJoinCode(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleQuickJoin();
                }}
                placeholder="00000"
                data-testid="menu-quick-join-code"
                className="flex-1 bg-transparent text-ui-fg font-sans font-bold tracking-[0.25em] text-[12px] px-2 py-2 outline-none placeholder:text-ui-fg-muted"
                aria-label={t.enterCode}
                autoFocus
              />
              <button
                type="button"
                onClick={() => void handleQuickJoin()}
                disabled={!canQuickJoin || quickJoinChecking}
                data-testid="menu-quick-join-submit"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-ui-accent text-ui-accent-contrast transition-all duration-200 ease-out active:scale-95 disabled:opacity-40"
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
            className={`mt-4 w-full py-3 rounded-2xl font-sans text-xs font-bold uppercase tracking-widest bg-ui-surface text-ui-fg border border-ui-border hover:bg-ui-surface-hover transition-all duration-200 ease-out active:scale-[0.98]`}
          >
            {t.cancel}
          </button>
        </ModalSheet>
      )}

      {showAppSettings && <AppSettingsModal onClose={() => setShowAppSettings(false)} />}
    </div>
  );
};
