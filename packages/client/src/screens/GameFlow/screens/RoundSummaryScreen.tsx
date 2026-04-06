import React, { useRef, useState } from 'react';
import { Button } from '../../../components/Button';
import { Confetti, MilestoneNotification } from '../../../components/Shared';
import { useGame } from '../../../context/GameContext';
import { TRANSLATIONS } from '../../../constants';

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
  const t = TRANSLATIONS[settings.general.language];
  const [milestone, setMilestone] = useState<{ points: number; team: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processingRef = useRef(false);

  const rawPoints =
    currentRoundStats.correct - (settings.general.skipPenalty ? currentRoundStats.skipped : 0);
  const points = Math.max(0, rawPoints);
  const activeTeam = teams[currentTeamIndex];
  const scoringTeam = teams.find((team) => team.id === currentRoundStats.teamId) || activeTeam;

  const confirmRoundResults = () => {
    if (!isHost || isSubmitting || processingRef.current) return;
    processingRef.current = true;
    setIsSubmitting(true);

    // Check for milestone before confirming
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
      // Use sendAction so it goes through handleGameAction and broadcasts
      sendAction({ action: 'CONFIRM_ROUND' });
      processingRef.current = false;
      setIsSubmitting(false);
    }, delay);
  };

  return (
    <div className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 relative`}>
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

      <header className="py-12 text-center space-y-4">
        <h2 className={`text-4xl font-serif tracking-widest uppercase ${currentTheme.textMain}`}>
          {t.timeIsUp}
        </h2>
        <div className="inline-block px-6 py-2 rounded-full border border-(--ui-border) bg-(--ui-surface)">
          <span
            className={`text-[10px] font-sans font-bold uppercase tracking-[0.4em] ${currentTheme.textSecondary}`}
          >
            {t.playedTeam.replace('{0}', scoringTeam?.name || '')}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="text-center space-y-2">
          <span className={`text-8xl font-serif font-black ${currentTheme.textAccent}`}>
            {points}
          </span>
          <p
            className={`text-[10px] font-sans font-bold uppercase tracking-[0.5em] opacity-40 ${currentTheme.textMain}`}
          >
            {t.roundPoints}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <div className="flex justify-between items-center px-4 opacity-60">
            <span className="text-[10px] font-bold uppercase tracking-widest">{t.guessed}</span>
            <span className="font-serif text-xl">{currentRoundStats.correct}</span>
          </div>
          <div className="flex justify-between items-center px-4 opacity-60">
            <span className="text-[10px] font-bold uppercase tracking-widest">{t.skippedWord}</span>
            <span className="font-serif text-xl">{currentRoundStats.skipped}</span>
          </div>
        </div>
      </div>

      <div className="py-8">
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
      </div>
    </div>
  );
};
