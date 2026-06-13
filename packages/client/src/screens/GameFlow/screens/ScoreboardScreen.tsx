import React, { useMemo } from 'react';
import { Button } from '../../../components/Button';
import { AppHeader, FixedBottomBar, ScreenShell } from '../../../components/layout';
import { ScreenTitle } from '../../../components/typography/ScreenTitle';
import { useGame } from '../../../context/GameContext';
import { footerIslandClassName } from '../../../constants/footerLayout';
import { useT } from '../../../hooks/useT';

const LADDER_TRACK_PX = 280;

export const ScoreboardScreen = () => {
  const { teams, settings, currentTheme, handleNextRound, isHost, leaveRoom } = useGame();
  const t = useT();

  const bgColor = currentTheme.bg;
  const textColor = 'text-ui-fg';
  const subTextColor = 'text-ui-fg-muted';

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => b.score - a.score), [teams]);
  const goal = settings.general.scoreToWin;

  return (
    <ScreenShell
      className={`${bgColor} ${textColor} font-sans antialiased transition-colors`}
      layout="fullPx6"
      contentClassName="pb-4"
      headerFixed
      footerFixed
      header={
        <AppHeader
          fixed
          title={<ScreenTitle themeClass={currentTheme.textMain}>{t.score}</ScreenTitle>}
          onBack={() => leaveRoom()}
          backAriaLabel={t.toMainMenu}
        />
      }
      footer={
        <FixedBottomBar island contentClassName={footerIslandClassName('fullBleed')}>
          {isHost ? (
            <Button themeClass={currentTheme.button} fullWidth size="xl" onClick={handleNextRound}>
              {t.nextRound}
            </Button>
          ) : (
            <p
              className={`text-center text-[10px] uppercase tracking-widest animate-pulse ${subTextColor}`}
            >
              {t.waitAdmin}
            </p>
          )}
        </FixedBottomBar>
      }
    >
      <main className="flex flex-col w-full relative">
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[350px] relative py-8">
          <div className="absolute top-4 flex flex-col items-center z-0 text-ui-fg-muted">
            <span className="material-symbols-outlined mb-1 text-ui-accent">emoji_events</span>
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-ui-accent">
              {t.goal}: {goal}
            </span>
          </div>

          <div className="flex flex-col items-center h-[280px] w-full justify-between relative my-10 px-10 overflow-visible">
            <div className="absolute w-px h-full left-1/2 -translate-x-1/2 top-0 bottom-0 bg-ui-border"></div>

            <div className="w-3 h-3 rounded-full border-4 z-10 relative bg-ui-surface-hover border-ui-bg"></div>
            <div className="w-2 h-2 rounded-full z-10 relative bg-ui-border"></div>
            <div className="w-2 h-2 rounded-full z-10 relative bg-ui-border"></div>
            <div className="w-2 h-2 rounded-full z-10 relative bg-ui-border"></div>
            <div className="w-2 h-2 rounded-full z-10 relative bg-ui-border"></div>
            <div className="w-3 h-3 rounded-full border-4 z-10 relative bg-ui-surface border-ui-bg"></div>

            {teams.map((team, idx) => {
              const progress = Math.min(1, team.score / goal);
              const topPos = 100 - progress * 100;
              const translateY = (topPos / 100) * LADDER_TRACK_PX;
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={team.id}
                  className="absolute top-0 left-0 right-0 h-0 z-20 flex justify-center transition-transform duration-1000 ease-out will-change-transform"
                  style={{ transform: `translateY(${translateY}px)` }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-ui-border transition-transform hover:scale-110"
                    style={{
                      backgroundColor:
                        team.colorHex || 'color-mix(in_srgb,var(--ui-fg-muted)_40%,transparent)',
                      color: 'var(--ui-accent-contrast)',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div
                    className={`absolute top-0 -translate-y-1/2 px-2 py-1 rounded shadow-sm whitespace-nowrap ${isEven ? 'left-[calc(50%+24px)]' : 'right-[calc(50%+24px)]'} bg-ui-card border border-ui-border text-ui-fg`}
                  >
                    <span className="text-[10px] font-bold tracking-wider">
                      {team.score} {t.pts}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full px-6 space-y-3 z-10">
          {sortedTeams.map((team, idx) => {
            const teamIndex = teams.findIndex((t) => t.id === team.id) + 1;
            const progress = Math.min(100, (team.score / goal) * 100);

            return (
              <div
                key={team.id}
                className={`rounded-2xl p-4 shadow-card flex items-center justify-between border animate-slide-up transition-all`}
                style={{
                  backgroundColor: 'color-mix(in_srgb,var(--ui-card)_85%,transparent)',
                  borderColor: team.score >= goal ? 'var(--ui-accent)' : 'var(--ui-border)',
                  animationDelay: `${idx * 100}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                    style={{
                      backgroundColor:
                        team.colorHex || 'color-mix(in_srgb,var(--ui-fg-muted)_40%,transparent)',
                      color: 'var(--ui-accent-contrast)',
                    }}
                  >
                    {teamIndex}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-serif text-lg tracking-wide ${textColor}`}>
                      {team.name}
                    </span>
                    <div className="h-1 mt-1.5 rounded-full overflow-hidden w-24 bg-ui-surface">
                      <div
                        className="scoreboard-progress-fill h-full rounded-full"
                        style={{
                          backgroundColor:
                            team.colorHex ||
                            'color-mix(in_srgb,var(--ui-fg-muted)_40%,transparent)',
                          ['--scoreboard-progress' as string]: `${progress}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`block text-2xl font-serif ${textColor}`}>{team.score}</span>
                  <span className={`text-[10px] uppercase tracking-widest ${subTextColor}`}>
                    {t.points}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </ScreenShell>
  );
};
