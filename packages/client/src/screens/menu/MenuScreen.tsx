import React, { useMemo, useState } from 'react';
import { AlertCircle, User, Settings, BookOpen, WifiOff, Maximize } from 'lucide-react';
import { Logo, ModalSheetTitle } from '../../components/Shared';
import { Button } from '../../components/Button';
import { HomeWordRain } from '../../components/HomeWordRain';
import { ModalSheet } from '../../components/ModalSheet';
import {
  AccentFooterCta,
  AppHeader,
  GlassIconButton,
  ScreenAccentGlow,
  ScreenShell,
} from '../../components/layout';
import { QuickJoinSheet } from './QuickJoinSheet';
import { EnterNameSheet } from './EnterNameSheet';
import { AppSettingsModal } from '../../components/Settings/AppSettingsModal';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';
import { toggleFullscreen, isStandaloneDisplay, isAppleMobile } from '../../utils/fullscreen';
import { hasTelegramInitData, shouldUseMenuCompactHeader } from '../../hooks/useTelegramApp';
import { RulesModal } from './RulesModal';
import { HEADER_ROW_MIN_PX, HOME_CARD_TOP_GAP_PX } from '../../constants/tmaLayoutConstants';
import { typographyClass, brandCaptionClass, systemBannerClass } from '../../constants/typography';
import { attemptRoomJoin, isValidRoomCode } from '../../utils/roomJoin';

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
  const isTelegram = hasTelegramInitData();

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

  const showProfileBadge = !isAuthenticated;
  const canQuickJoin = isValidRoomCode(quickJoinCode);
  const quickJoinLabel = useMemo(() => t.joinGame, [t.joinGame]);

  const handleQuickJoin = async () => {
    if (!canQuickJoin || quickJoinChecking) return;
    setQuickJoinChecking(true);
    try {
      const result = await attemptRoomJoin(quickJoinCode, {
        checkRoomExists,
        onJoin: (code) => {
          setRoomCode(code);
          setGameState(GameState.ENTER_NAME);
        },
      });
      if (result === 'not_found') {
        showNotification(t.roomNotFound.replace('{0}', quickJoinCode), 'error');
      }
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

  const menuActionIcons = (
    <>
      <div className="relative shrink-0 overflow-visible">
        <GlassIconButton onClick={handleProfileClick} ariaLabel="Profile">
          <User size={16} strokeWidth={2} aria-hidden />
        </GlassIconButton>
        {showProfileBadge ? (
          <span
            data-testid="menu-profile-guest-badge"
            className="menu-profile-guest-badge"
            aria-hidden
          />
        ) : null}
      </div>
      <GlassIconButton onClick={() => setShowAppSettings(true)} ariaLabel="Settings">
        <Settings size={16} strokeWidth={2} aria-hidden />
      </GlassIconButton>
      <GlassIconButton
        onClick={() => setShowRules(true)}
        ariaLabel={t.rulesTitle}
        testId="menu-rules-button"
      >
        <BookOpen size={16} strokeWidth={2} aria-hidden />
      </GlassIconButton>
      {!isStandaloneDisplay() && !isTelegram && (
        <GlassIconButton onClick={() => void handleFullscreenClick()} ariaLabel="Fullscreen">
          <Maximize size={16} strokeWidth={2} aria-hidden />
        </GlassIconButton>
      )}
    </>
  );

  const frozenChromeClass = isEnterName ? 'pointer-events-none select-none' : undefined;
  const menuHeaderClass = [
    frozenChromeClass,
    shouldUseMenuCompactHeader() ? 'ui-app-header--menu-compact' : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="relative flex flex-col h-full min-h-0 w-full bg-ui-bg transition-colors duration-500 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <ScreenAccentGlow />
        <HomeWordRain />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(var(--ui-fg) 0.5px, transparent 0.5px)',
            backgroundSize: '18px 18px',
          }}
        />
      </div>

      <ScreenShell
        layout="canonical"
        className="relative z-10 bg-transparent"
        headerFixed
        header={
          <AppHeader
            fixed
            data-testid="menu-app-header"
            tgChromeGutter={hasTelegramInitData()}
            childRowHeightPx={HEADER_ROW_MIN_PX}
            ariaHidden={isEnterName}
            className={menuHeaderClass}
          >
            <div
              className="flex shrink-0 items-center gap-2 sm:gap-3"
              data-testid="menu-action-icons"
            >
              {menuActionIcons}
            </div>
          </AppHeader>
        }
        contentClassName="flex-1 min-h-0"
      >
        <main
          aria-hidden={isEnterName ? true : undefined}
          className={[
            'relative flex flex-1 flex-col items-center w-full max-w-xs mx-auto pb-20 min-h-0',
            frozenChromeClass,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ paddingTop: HOME_CARD_TOP_GAP_PX }}
        >
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <div
              data-testid="menu-home-hero-logo"
              className="menu-home-hero__logo flex min-h-0 w-full items-end justify-center"
            >
              <div className="scale-[0.85] shrink-0 pb-3">
                <Logo theme={currentTheme} variant="mark" />
              </div>
            </div>

            <div
              data-testid="menu-home-hero-tagline"
              className="menu-home-hero__tagline flex min-h-0 w-full items-start justify-center"
            >
              <div className="scale-[0.85] shrink-0">
                <Logo theme={currentTheme} tagline={t.homeTagline} variant="tagline" />
              </div>
            </div>

            <div
              data-testid="menu-home-hero-spacer"
              className="menu-home-hero__spacer flex min-h-0 w-full items-center justify-center px-1"
            >
              {connectionError ? (
                <div className="p-4 bg-[color-mix(in_srgb,var(--ui-danger)_12%,transparent)] border border-[color-mix(in_srgb,var(--ui-danger)_25%,transparent)] rounded-2xl flex items-center gap-4 animate-shake shrink-0 w-full">
                  <AlertCircle className="text-ui-danger shrink-0" size={20} />
                  <p className={`${systemBannerClass} tracking-wide text-ui-danger`}>
                    Server Error: {connectionError}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="w-full space-y-3 flex flex-col items-center shrink-0 animate-slide-up px-4 overflow-visible">
            <AccentFooterCta
              themeButtonClass={currentTheme.button}
              onClick={() => void handleCreateRoom()}
              variant="animated"
              loading={createRoomBusy}
              disabled={createRoomBusy}
              buttonTestId="menu-create-game"
              shellTestId="menu-create-game-shell"
            >
              {t.createGame}
            </AccentFooterCta>
            <Button
              type="button"
              variant="secondary"
              size="xl"
              fullWidth
              onClick={() => setShowQuickJoin(true)}
              data-testid="menu-join-game"
            >
              {quickJoinLabel}
            </Button>

            <div data-testid="menu-or-divider" className="flex w-full items-center gap-4 py-3 my-1">
              <div
                className="h-px flex-1 bg-[color-mix(in_srgb,var(--ui-border)_32%,transparent)]"
                aria-hidden
              />
              <span
                className={`${typographyClass.label} tracking-widest text-ui-fg-subtle shrink-0`}
              >
                {t.menuOrDivider}
              </span>
              <div
                className="h-px flex-1 bg-[color-mix(in_srgb,var(--ui-border)_32%,transparent)]"
                aria-hidden
              />
            </div>

            <Button
              type="button"
              variant="tertiary"
              size="xl"
              fullWidth
              icon={<WifiOff size={16} className="block shrink-0" strokeWidth={2} aria-hidden />}
              onClick={startOfflineGame}
              data-testid="menu-offline"
            >
              {t.playOffline}
            </Button>
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
            <ModalSheetTitle id="fullscreen-hint-title" themeClass="text-ui-fg">
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
