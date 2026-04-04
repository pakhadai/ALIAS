import React, { useEffect, useMemo, useState } from 'react';
import { AppTheme } from '../../../types';
import { useGame } from '../../../context/GameContext';
import { TRANSLATIONS } from '../../../constants';

export const ScoreboardScreen = () => {
  const { teams, settings, handleNextRound, isHost } = useGame();
  const t = TRANSLATIONS[settings.language];
  const [mounted, setMounted] = useState(false);

  const isDark = settings.theme === AppTheme.PREMIUM_DARK;
  const bgColor = isDark ? 'bg-premium-dark-bg' : 'bg-silver-bg';
  const textColor = isDark ? 'text-white' : 'text-premium-black';
  const subTextColor = isDark ? 'text-gray-400' : 'text-text-sub';

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => b.score - a.score), [teams]);
  const goal = settings.scoreToWin;

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      className={`flex flex-col h-screen w-full ${bgColor} ${textColor} font-sans antialiased overflow-hidden transition-colors`}
    >
      {/* Header */}
      <header className="relative z-20 w-full px-6 pt-12 pb-2 flex justify-center items-center bg-transparent backdrop-blur-sm">
        <div className="text-center">
          <h2 className="font-serif text-lg tracking-widest uppercase">{t.score}</h2>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full relative overflow-y-auto no-scrollbar pb-32">
        {/* Visual Ladder/Path */}
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[350px] relative py-8">
          <div className="absolute top-4 flex flex-col items-center z-0 opacity-40">
            <span className="material-symbols-outlined mb-1 text-champagne-dark">emoji_events</span>
            <span
              className={`text-[10px] tracking-[0.2em] uppercase font-bold text-champagne-dark`}
            >
              {t.goal}: {goal}
            </span>
          </div>

          <div className="flex flex-col items-center h-[280px] w-full justify-between relative my-10 px-10">
            <div
              className={`absolute w-px h-full left-1/2 -translate-x-1/2 top-0 bottom-0 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
            ></div>

            <div
              className={`w-3 h-3 rounded-full border-4 z-10 relative ${isDark ? 'bg-white/20 border-premium-dark-bg' : 'bg-gray-200 border-silver-bg'}`}
            ></div>
            <div
              className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
            ></div>
            <div
              className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
            ></div>
            <div
              className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
            ></div>
            <div
              className={`w-2 h-2 rounded-full z-10 relative ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}
            ></div>
            <div
              className={`w-3 h-3 rounded-full border-4 z-10 relative ${isDark ? 'bg-white/30 border-premium-dark-bg' : 'bg-gray-300 border-silver-bg'}`}
            ></div>

            {teams.map((team, idx) => {
              const progress = Math.min(1, team.score / goal);
              const topPos = 100 - progress * 100;
              const isEven = idx % 2 === 0;

              return (
                <div
                  key={team.id}
                  className="absolute w-full h-0 z-20 flex justify-center transition-all duration-1000 ease-out"
                  style={{ top: `${topPos}%` }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white transition-transform hover:scale-110`}
                    style={{
                      backgroundColor: team.colorHex || '#888',
                      color: isDark ? 'white' : 'black',
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div
                    className={`absolute top-0 -translate-y-1/2 px-2 py-1 rounded shadow-sm whitespace-nowrap ${isEven ? 'left-[calc(50%+24px)]' : 'right-[calc(50%+24px)]'} ${isDark ? 'bg-white/5 border border-white/5 text-white' : 'bg-white text-premium-black'}`}
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

        {/* Detailed Team Cards */}
        <div className="w-full px-6 space-y-3 z-10">
          {sortedTeams.map((team, idx) => {
            const teamIndex = teams.findIndex((t) => t.id === team.id) + 1;
            const progress = Math.min(100, (team.score / goal) * 100);

            return (
              <div
                key={team.id}
                className={`rounded-2xl p-4 shadow-card flex items-center justify-between border animate-slide-up transition-all`}
                style={{
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                  borderColor:
                    team.score >= goal
                      ? '#F3E5AB'
                      : isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'transparent',
                  animationDelay: `${idx * 100}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                    style={{
                      backgroundColor: team.colorHex || '#888',
                      color: isDark ? 'white' : 'black',
                    }}
                  >
                    {teamIndex}
                  </div>
                  <div className="flex flex-col">
                    <span className={`font-serif text-lg tracking-wide ${textColor}`}>
                      {team.name}
                    </span>
                    <div
                      className={`bg-gray-100 h-1 mt-1.5 rounded-full overflow-hidden w-24 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          backgroundColor: team.colorHex || '#888',
                          width: mounted ? `${progress}%` : '0%',
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

      {/* Footer Button */}
      <footer
        className={`fixed bottom-0 w-full pt-8 pb-8 px-6 z-30 pointer-events-auto bg-gradient-to-t ${isDark ? 'from-premium-dark-bg via-premium-dark-bg' : 'from-silver-bg via-silver-bg'} to-transparent`}
      >
        {isHost ? (
          <button
            onClick={handleNextRound}
            className={`w-full h-14 rounded-full flex items-center justify-center transition-all active:scale-[0.98] shadow-soft hover:shadow-lg group ${isDark ? 'bg-champagne-gold text-premium-black' : 'bg-premium-black text-white'}`}
          >
            <span className="font-sans font-medium text-sm uppercase tracking-[0.2em] group-hover:tracking-[0.25em] transition-all">
              {t.nextRound}
            </span>
          </button>
        ) : (
          <p
            className={`text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse ${textColor}`}
          >
            {t.waitAdmin}
          </p>
        )}
      </footer>
    </div>
  );
};
