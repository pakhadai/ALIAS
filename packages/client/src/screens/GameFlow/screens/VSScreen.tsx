import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { AvatarDisplay } from '../../../components/AvatarDisplay';
import { useGame } from '../../../context/GameContext';
import { useT } from '../../../hooks/useT';
import type { Player, Team } from '../../../types';

type VsElement =
  | { type: 'vs'; delay: number }
  | { type: 'player'; player: Player | undefined; team: Team; delay: number };

export const VSScreen = () => {
  const { teams, currentTheme, sendAction, isHost } = useGame();
  const t = useT();
  const [showButton, setShowButton] = useState(false);

  const totalDelay = teams.length * 2 * 0.6;
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), totalDelay * 1000 + 400);
    return () => clearTimeout(timer);
  }, [totalDelay]);

  const elements: VsElement[] = [];
  teams.forEach((team: Team, i) => {
    if (i > 0) {
      elements.push({ type: 'vs', delay: (i * 2 - 1) * 0.6 });
    }
    elements.push({ type: 'player', player: team.players[0], team, delay: i * 2 * 0.6 });
  });

  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} p-8 justify-center items-center overflow-hidden`}
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        {elements.map((el, i) => {
          if (el.type === 'vs') {
            return (
              <div
                key={`vs-${i}`}
                className="animate-vs-scale-in opacity-0"
                style={{ animationDelay: `${el.delay}s`, animationFillMode: 'forwards' }}
              >
                <span className="text-4xl font-black tracking-widest text-ui-accent drop-shadow-lg">
                  {t.vs}
                </span>
              </div>
            );
          }
          const isFromLeft = elements.filter((e) => e.type === 'player').indexOf(el) % 2 === 0;
          return (
            <div
              key={el.type === 'player' ? el.player?.id || i : i}
              className={`${isFromLeft ? 'animate-vs-from-left' : 'animate-vs-from-right'} opacity-0 w-full`}
              style={{ animationDelay: `${el.delay}s`, animationFillMode: 'forwards' }}
            >
              <div
                className={`flex items-center gap-5 ${isFromLeft ? 'justify-start' : 'justify-end'}`}
              >
                {isFromLeft ? (
                  <>
                    <div
                      className={`w-4 h-4 rounded-full ${el.type === 'player' ? el.team.color : ''}`}
                    />
                    {el.type === 'player' && el.player?.avatarId != null ? (
                      <AvatarDisplay avatarId={el.player.avatarId} size={56} />
                    ) : (
                      <span className="text-5xl">
                        {el.type === 'player' ? el.player?.avatar : null}
                      </span>
                    )}
                    <span
                      className={`text-3xl font-serif font-bold tracking-wide ${currentTheme.textMain}`}
                    >
                      {el.type === 'player' ? el.player?.name : null}
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={`text-3xl font-serif font-bold tracking-wide ${currentTheme.textMain}`}
                    >
                      {el.type === 'player' ? el.player?.name : null}
                    </span>
                    {el.type === 'player' && el.player?.avatarId != null ? (
                      <AvatarDisplay avatarId={el.player.avatarId} size={56} />
                    ) : (
                      <span className="text-5xl">
                        {el.type === 'player' ? el.player?.avatar : null}
                      </span>
                    )}
                    <div
                      className={`w-4 h-4 rounded-full ${el.type === 'player' ? el.team.color : ''}`}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`w-full max-w-sm mt-16 transition-all duration-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      >
        {isHost ? (
          <Button
            themeClass={currentTheme.button}
            fullWidth
            size="xl"
            onClick={() => sendAction({ action: 'START_GAME' })}
          >
            {t.startGame}
          </Button>
        ) : (
          <p
            className={`text-center text-[10px] uppercase tracking-widest opacity-40 animate-pulse ${currentTheme.textSecondary}`}
          >
            {t.waitHost}
          </p>
        )}
      </div>
    </div>
  );
};
