import React from 'react';
import { Button } from '../../components/Button';
import { AppHeader, ScreenShell } from '../../components/layout';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useT } from '../../hooks/useT';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { typographyClass } from '../../constants/typography';

export const RulesScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const t = useT();
  return (
    <ScreenShell
      className={currentTheme.bg}
      contentClassName="px-6 md:px-10 justify-center items-center pb-6 md:pb-10"
      headerFixed
      header={
        <AppHeader fixed onBack={() => setGameState(GameState.MENU)} backAriaLabel={t.close} />
      }
    >
      <div
        className={`w-full max-w-2xl space-y-10 p-8 md:p-12 rounded-[2.5rem] ${currentTheme.card} overflow-y-auto`}
        style={{ maxHeight: '85vh' }}
      >
        <ScreenTitle themeClass={currentTheme.textMain} className="mb-6 text-center">
          {t.infoRules}
        </ScreenTitle>
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
                  className={`${typographyClass.body} tracking-wide font-light ${currentTheme.textSecondary}`}
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
    </ScreenShell>
  );
};
