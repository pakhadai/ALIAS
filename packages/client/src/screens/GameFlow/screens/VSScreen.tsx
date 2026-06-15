import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { PlayerAvatar } from '../../../components/AvatarDisplay';
import { FixedBottomBar, ScreenShell } from '../../../components/layout';
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
    <ScreenShell
      layout="fullPx8"
      className={currentTheme.bg}
      contentClassName="justify-center items-center overflow-hidden"
      footer={
        <FixedBottomBar contentClassName="w-full max-w-sm">
          <div
            className={`transition-all duration-500 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {isHost ? (
              <Button
                variant="primary"
                volume="cta"
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
        </FixedBottomBar>
      }
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
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          el.type === 'player' ? el.team.colorHex || undefined : undefined,
                      }}
                    />
                    {el.type === 'player' && el.player ? (
                      <PlayerAvatar player={el.player} size={56} emojiClassName="text-5xl" />
                    ) : null}
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
                    {el.type === 'player' && el.player ? (
                      <PlayerAvatar player={el.player} size={56} emojiClassName="text-5xl" />
                    ) : null}
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          el.type === 'player' ? el.team.colorHex || undefined : undefined,
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
};
