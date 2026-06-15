import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../../components/layout';
import { PlayerAvatar } from '../../../components/AvatarDisplay';
import { ScreenTitle } from '../../../components/typography/ScreenTitle';
import { footerIslandClassName } from '../../../constants/footerLayout';
import { useBackNavigationGuard } from '../../../context/BackNavigationGuardContext';
import { useGame } from '../../../context/GameContext';
import { useT } from '../../../hooks/useT';
import { hasTelegramInitData } from '../../../hooks/useTelegramApp';
import { GameState } from '../../../types';

export const PreRoundScreen = () => {
  const {
    currentTheme,
    teams,
    currentTeamIndex,
    handleStartRound,
    setGameState,
    isHost,
    myPlayerId,
    gameMode,
    leaveRoom,
    settings,
  } = useGame();
  const t = useT();
  const { registerGuard } = useBackNavigationGuard();
  const isTelegramSession = hasTelegramInitData();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pendingLeaveRef = useRef<(() => void) | null>(null);
  const isSolo = (settings.general.teamMode ?? 'TEAMS') === 'SOLO';
  const activeTeam = teams[currentTeamIndex];

  const openExitConfirm = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const requestLeave = useCallback((proceed: () => void) => {
    pendingLeaveRef.current = proceed;
    setShowExitConfirm(true);
  }, []);

  useEffect(() => {
    registerGuard({
      isDirty: true,
      requestLeave,
    });
    return () => registerGuard(null);
  }, [registerGuard, requestLeave]);

  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);
    const proceed = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    if (proceed) proceed();
    else leaveRoom();
  }, [leaveRoom]);

  const handleCancelExit = useCallback(() => {
    setShowExitConfirm(false);
    pendingLeaveRef.current = null;
  }, []);

  const menuItems = useMemo(
    () => [
      {
        id: 'main-menu',
        label: t.toMainMenu,
        onSelect: openExitConfirm,
      },
    ],
    [openExitConfirm, t.toMainMenu]
  );

  if (!activeTeam || activeTeam.players.length === 0) {
    return (
      <ScreenShell
        layout="fullPx8"
        className={`${currentTheme.bg} text-center`}
        contentClassName="justify-center items-center"
      >
        <div className="space-y-8">
          <p className={`text-2xl ${currentTheme.textMain}`}>{t.noPlayersInTeam}</p>
          {isHost && (
            <Button
              variant="primary"
              volume="cta"
              themeClass={currentTheme.button}
              onClick={() => setGameState(GameState.LOBBY)}
            >
              {t.backToLobby}
            </Button>
          )}
        </div>
      </ScreenShell>
    );
  }

  const playerIdx = Math.min(activeTeam.nextPlayerIndex, activeTeam.players.length - 1);
  const explainer = activeTeam.players[playerIdx] || activeTeam.players[0];
  if (!explainer) {
    return (
      <ScreenShell
        layout="fullPx8"
        className={`${currentTheme.bg} text-center`}
        contentClassName="justify-center items-center"
      >
        <p className={`text-2xl ${currentTheme.textMain}`}>{t.noPlayersInTeam}</p>
      </ScreenShell>
    );
  }
  const isActualExplainer = explainer.id === myPlayerId;

  return (
    <>
      <ScreenShell
        layout="fullPx8"
        className={`${currentTheme.bg} text-center relative`}
        contentClassName="flex flex-col justify-center items-center min-h-[calc(100dvh-var(--app-page-header-height,0px)-var(--footer-island-scroll-padding))]"
        headerFixed
        footerFixed
        header={
          <AppHeader
            fixed
            title={
              !isSolo ? (
                <ScreenTitle themeClass={currentTheme.textMain}>{t.playingNow}</ScreenTitle>
              ) : undefined
            }
            onBack={openExitConfirm}
            backAriaLabel={t.toMainMenu}
            menuItems={isTelegramSession ? undefined : menuItems}
          />
        }
        footer={
          <FixedBottomBar island contentClassName={footerIslandClassName('fullBleed')}>
            {gameMode === 'OFFLINE' || isActualExplainer ? (
              <Button
                variant="primary"
                volume="cta"
                themeClass={currentTheme.button}
                size="xl"
                onClick={handleStartRound}
                fullWidth
              >
                {t.takePhone}
              </Button>
            ) : (
              <p
                className={`text-center text-[10px] uppercase tracking-widest animate-pulse ${currentTheme.textSecondary}`}
              >
                {t.waitAdmin}
              </p>
            )}
          </FixedBottomBar>
        }
      >
        <div className="flex flex-col justify-center items-center w-full max-w-sm text-center">
          <div className="space-y-8 animate-pop-in w-full max-w-sm flex flex-col items-center">
            {!isSolo && (
              <div className="inline-block px-8 py-3 rounded-full border border-ui-border bg-ui-surface">
                <div className="flex items-center justify-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${activeTeam.color}`} />
                  <span className={`font-serif text-3xl ${currentTheme.textMain}`}>
                    {activeTeam.name}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`space-y-4 flex flex-col items-center text-center ${isSolo ? '' : 'pt-4'}`}
            >
              <div className="mb-1">
                <PlayerAvatar player={explainer} size={64} emojiClassName="text-6xl" />
              </div>
              <p className={`text-5xl font-serif ${currentTheme.textMain}`}>{explainer.name}</p>
              <p
                className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}
              >
                {t.explains}
              </p>
            </div>

            {gameMode === 'OFFLINE' && (
              <div
                className={`pt-4 text-[10px] font-sans font-bold uppercase tracking-[0.3em] ${currentTheme.textSecondary}`}
              >
                {t.passPhoneTo.replace('{0}', explainer.name)}
              </div>
            )}
          </div>
        </div>
      </ScreenShell>

      <ConfirmationModal
        isOpen={showExitConfirm}
        title={t.leaveLobbyConfirm}
        message={t.leaveLobbyMsg}
        isDanger
        theme={currentTheme}
        onCancel={handleCancelExit}
        onConfirm={handleConfirmExit}
        confirmText={t.confirmExit}
        cancelText={t.goBack}
      />
    </>
  );
};
