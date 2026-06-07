import React from 'react';
import { Button } from '../../components/Button';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';

export const RulesScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const t = useT();
  return (
    <div
      className={`flex flex-col min-h-screen ${currentTheme.bg} px-6 pt-safe-top pb-6 md:px-10 md:pb-10 justify-center items-center`}
    >
      <div
        className={`w-full max-w-2xl space-y-10 p-8 md:p-12 rounded-[2.5rem] ${currentTheme.card} overflow-y-auto`}
        style={{ maxHeight: '85vh' }}
      >
        <h2 className={`text-3xl font-serif mb-6 text-center ${currentTheme.textMain}`}>
          {t.infoRules}
        </h2>
        <div className="space-y-5 mb-8">
          {[t.infoRule1, t.infoRule2, t.infoRule3, t.infoRule4, t.infoRule5, t.infoRule6].map(
            (rule: string, i: number) => (
              <div key={i} className="flex gap-4 items-start">
                <span
                  className={`font-serif text-xl opacity-20 shrink-0 w-5 text-right ${currentTheme.textMain}`}
                >
                  {i + 1}
                </span>
                <p
                  className={`text-sm leading-relaxed tracking-wide font-light ${currentTheme.textSecondary}`}
                >
                  {rule}
                </p>
              </div>
            )
          )}
        </div>
        <Button
          themeClass={currentTheme.button}
          fullWidth
          onClick={() => setGameState(GameState.MENU)}
          size="xl"
        >
          {t.close}
        </Button>
      </div>
    </div>
  );
};
