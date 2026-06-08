import React, { useMemo, useState } from 'react';
import { AlertCircle, User, Settings, BookOpen, WifiOff, Maximize } from 'lucide-react';
import { Logo, ModalSheetTitle } from '../../components/Shared';
import { ModalSheet } from '../../components/ModalSheet';
import { AppHeader, ScreenShell } from '../../components/layout';
import { QuickJoinSheet } from './QuickJoinSheet';
import { EnterNameSheet } from './EnterNameSheet';
import { AppSettingsModal } from '../../components/Settings/AppSettingsModal';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';
import { toggleFullscreen, isStandaloneDisplay, isAppleMobile } from '../../utils/fullscreen';
import { isTelegramMiniApp } from '../../hooks/useTelegramApp';
import { RulesModal } from './RulesModal';
import { ROOM_CODE_LENGTH } from '../../constants';
import { HOME_CARD_TOP_GAP_PX } from '../../constants/tmaLayoutConstants';
import { typographyClass, brandCaptionClass, systemBannerClass } from '../../constants/typography';

export const MenuScreen = () => {
  const {
    gameState,
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
  const isEnterName = gameState === GameState.ENTER_NAME;
  const { isAuthenticated } = useAuthContext();
  const [showRules, setShowRules] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [showQuickJoin, setShowQuickJoin] = useState(false);
  const [quickJoinCode, setQuickJoinCode] = useState('');
  const [quickJoinChecking, setQuickJoinChecking] = useState(false);
  const [createRoomBusy, setCreateRoomBusy] = useState(false);
  const t = useT();
  const isTelegram = isTelegramMiniApp();

  void setSettings;

  const handleProfileClick = () => {
    setGameState(GameState.PROFILE);
  };

  const handleFullscreenClick = async () => {
    if (isStandaloneDisplay() || isTelegram) return;
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

  const menuHeaderIcons = (
    <div className="flex items-center gap-2 sm:gap-3">
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
      {!isStandaloneDisplay() && !isTelegram && (
        <button
          type="button"
          onClick={() => void handleFullscreenClick()}
          className={menuHeaderIconBtn}
          aria-label="Fullscreen"
        >
          <Maximize size={22} className={menuHeaderIcon} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );

  const frozenChromeClass = isEnterName ? 'pointer-events-none select-none' : undefined;

  return (
    <div
      className={`relative flex flex-col min-h-[var(--tg-viewport-height,100dvh)] h-full w-full ${currentTheme.bg} transition-colors duration-500 overflow-hidden`}
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

      <ScreenShell
        className={`relative z-10 ${currentTheme.bg}`}
        header={
          <AppHeader
            data-testid="menu-app-header"
            gradient
            right={menuHeaderIcons}
            ariaHidden={isEnterName}
            className={frozenChromeClass}
          />
        }
        contentClassName="max-w-2xl mx-auto w-full flex-1 min-h-0"
      >
        <main
          aria-hidden={isEnterName ? true : undefined}
          className={[
            'relative flex flex-1 flex-col items-center justify-center w-full max-w-xs mx-auto px-6 md:px-8 pb-20 min-h-0',
            frozenChromeClass,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ paddingTop: HOME_CARD_TOP_GAP_PX }}
        >
          <div className="scale-[0.85] origin-top">
            <Logo theme={currentTheme} />
          </div>

          {connectionError && (
            <div className="mt-8 p-4 bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)] rounded-2xl flex items-center gap-4 animate-shake">
              <AlertCircle className="text-ui-danger" size={20} />
              <p className={`${systemBannerClass} tracking-wide text-ui-danger`}>
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
              <span className={`${typographyClass.label} font-sans tracking-wide`}>
                {t.createGame}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowQuickJoin(true)}
              data-testid="menu-join-game"
              className="w-full h-14 rounded-full flex items-center justify-center transition-all duration-200 ease-out active:scale-[0.98] bg-ui-surface text-ui-fg border border-ui-border hover:bg-ui-surface-hover"
            >
              <span className={`${typographyClass.label} font-sans tracking-wide`}>
                {quickJoinLabel}
              </span>
            </button>

            <div className="flex items-center gap-3 w-full opacity-20 py-1">
              <div className="h-px flex-1 bg-ui-border" />
              <span
                className={`${typographyClass.label} tracking-widest text-ui-fg-muted shrink-0`}
              >
                {t.menuOrDivider}
              </span>
              <div className="h-px flex-1 bg-ui-border" />
            </div>

            <button
              type="button"
              onClick={startOfflineGame}
              data-testid="menu-offline"
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ui-border bg-transparent text-ui-fg-muted ${typographyClass.label} font-sans tracking-wide transition-all duration-200 ease-out active:scale-[0.98] hover:bg-ui-surface/40 hover:text-ui-fg`}
            >
              <WifiOff size={14} className="opacity-80 shrink-0" strokeWidth={2} />
              <span>{t.playOffline}</span>
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pt-4 pb-safe-bottom">
            <div className="flex items-center gap-2 opacity-25">
              <div className="h-px w-6 bg-ui-border" />
              <span className={`${brandCaptionClass} text-ui-fg-muted`}>v{__APP_VERSION__}</span>
              <div className="h-px w-6 bg-ui-border" />
            </div>
          </div>
        </main>
      </ScreenShell>

      {!isEnterName ? (
        <RulesModal
          isOpen={showRules}
          onClose={() => setShowRules(false)}
          t={t}
          currentTheme={currentTheme}
          settings={settings}
        />
      ) : null}

      {!isEnterName ? (
        <ModalSheet
          open={showFullscreenHint}
          onClose={() => setShowFullscreenHint(false)}
          size="compact"
          showClose
          closeAriaLabel={t.close}
          ariaLabelledBy="fullscreen-hint-title"
          header={
            <ModalSheetTitle id="fullscreen-hint-title" themeClass={currentTheme.textMain}>
              {t.fullscreenUnavailableTitle}
            </ModalSheetTitle>
          }
        >
          <p className={`text-ui-fg-muted ${typographyClass.body} leading-relaxed`}>
            {t.fullscreenUnavailableBody}
          </p>
        </ModalSheet>
      ) : null}

      {showQuickJoin && !isEnterName ? (
        <QuickJoinSheet
          onDismiss={() => setShowQuickJoin(false)}
          theme={currentTheme}
          t={t}
          canSubmit={canQuickJoin}
          checking={quickJoinChecking}
          code={quickJoinCode}
          onCodeChange={setQuickJoinCode}
          onSubmit={() => void handleQuickJoin()}
        />
      ) : null}

      {showAppSettings && !isEnterName ? (
        <AppSettingsModal onClose={() => setShowAppSettings(false)} />
      ) : null}

      {isEnterName ? <EnterNameSheet /> : null}
    </div>
  );
};
