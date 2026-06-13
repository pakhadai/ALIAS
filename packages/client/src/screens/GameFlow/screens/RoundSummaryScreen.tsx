import React, { useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { Confetti, MilestoneNotification } from '../../../components/Shared';
import { FixedBottomBar, ScreenShell } from '../../../components/layout';
import { footerIslandClassName } from '../../../constants/footerLayout';
import { useGame } from '../../../context/GameContext';
import { useT } from '../../../hooks/useT';

export const RoundSummaryScreen = () => {
  const {
    currentTheme,
    teams,
    currentTeamIndex,
    currentRoundStats,
    settings,
    playSound,
    isHost,
    sendAction,
  } = useGame();
  const t = useT();
  const [milestone, setMilestone] = useState<{ points: number; team: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processingRef = useRef(false);

  const isSolo = (settings.general.teamMode ?? 'TEAMS') === 'SOLO';
  const rawPoints =
    currentRoundStats.correct - (settings.general.skipPenalty ? currentRoundStats.skipped : 0);
  const points = Math.max(0, rawPoints);
  const activeTeam = teams[currentTeamIndex];
  const scoringTeam = teams.find((team) => team.id === currentRoundStats.teamId) || activeTeam;
  const explainerName =
    currentRoundStats.explainerName || scoringTeam?.players[0]?.name || scoringTeam?.name || '';
  const nextTeam = teams.length > 0 ? teams[(currentTeamIndex + 1) % teams.length] : undefined;
  const nextPlayerName = nextTeam?.players[0]?.name || nextTeam?.name || '';
  const showNextUp = isSolo && teams.length > 1 && nextPlayerName.length > 0;

  const confirmRoundResults = () => {
    if (!isHost || isSubmitting || processingRef.current) return;
    processingRef.current = true;
    setIsSubmitting(true);

    const oldScore = scoringTeam?.score || 0;
    const newScore = Math.max(0, oldScore + points);
    const oldTens = Math.floor(oldScore / 10);
    const newTens = Math.floor(newScore / 10);

    let delay = 0;
    if (newTens > oldTens && newScore < settings.general.scoreToWin) {
      setMilestone({ points: newTens * 10, team: scoringTeam?.name || '' });
      if (settings.general.soundEnabled) playSound('win');
      delay = 3000;
    }

    setTimeout(() => {
      sendAction({ action: 'CONFIRM_ROUND' });
      processingRef.current = false;
      setIsSubmitting(false);
    }, delay);
  };

  return (
    <div data-testid="round-summary" className="relative h-full min-h-0 flex w-full flex-col">
      {milestone && (
        <MilestoneNotification
          points={milestone.points}
          teamName={milestone.team}
          onComplete={() => setMilestone(null)}
          milestoneText={t.milestone}
          reachedText={t.teamReached}
        />
      )}
      {points > 0 && <Confetti />}

      <ScreenShell
        layout="fullPx8"
        className={currentTheme.bg}
        footerFixed
        contentClassName="flex flex-col min-h-[calc(100dvh-var(--footer-island-scroll-padding))]"
        footer={
          <FixedBottomBar island contentClassName={footerIslandClassName('fullBleed')}>
            {isHost ? (
              <Button
                themeClass={currentTheme.button}
                fullWidth
                size="xl"
                onClick={confirmRoundResults}
                disabled={!!milestone || isSubmitting}
              >
                {t.continue}
              </Button>
            ) : (
              <div
                className={`text-center font-black uppercase tracking-widest text-xs animate-pulse ${currentTheme.textSecondary}`}
              >
                {t.waitAdmin}
              </div>
            )}
          </FixedBottomBar>
        }
      >
        <header className="py-12 text-center space-y-4">
          <h2 className={`text-4xl font-serif tracking-widest uppercase ${currentTheme.textMain}`}>
            {t.timeIsUp}
          </h2>
          {isSolo ? (
            <div className="space-y-3">
              <div className="inline-block px-6 py-2 rounded-full border border-ui-border bg-ui-surface">
                <span
                  className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}
                >
                  {t.playedBy.replace('{0}', explainerName)}
                </span>
              </div>
              {showNextUp && (
                <p
                  className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}
                >
                  {t.nextUp.replace('{0}', nextPlayerName)}
                </p>
              )}
            </div>
          ) : (
            <div className="inline-block px-6 py-2 rounded-full border border-ui-border bg-ui-surface">
              <span
                className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}
              >
                {t.playedTeam.replace('{0}', scoringTeam?.name || '')}
              </span>
            </div>
          )}
        </header>

        <div className="flex flex-1 flex-col items-center justify-center space-y-12 min-h-[40vh]">
          <div className="text-center space-y-2">
            <span className={`text-8xl font-serif font-black ${currentTheme.textAccent}`}>
              {points}
            </span>
            <p
              className={`text-[10px] font-sans font-bold uppercase tracking-[0.5em] ${currentTheme.textSecondary}`}
            >
              {t.roundPoints}
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-between items-center px-4">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${currentTheme.textSecondary}`}
              >
                {t.guessed}
              </span>
              <span className={`font-serif text-xl ${currentTheme.textMain}`}>
                {currentRoundStats.correct}
              </span>
            </div>
            <div className="flex justify-between items-center px-4">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${currentTheme.textSecondary}`}
              >
                {t.skippedWord}
              </span>
              <span className={`font-serif text-xl ${currentTheme.textMain}`}>
                {currentRoundStats.skipped}
              </span>
            </div>
          </div>
        </div>
      </ScreenShell>
    </div>
  );
};
