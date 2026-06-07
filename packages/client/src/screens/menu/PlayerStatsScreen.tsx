import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { GameState, Language } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useAppLogin } from '../../context/AppLoginContext';
import { useT } from '../../hooks/useT';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useTelegramApp } from '../../hooks/useTelegramApp';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import {
  typographyClass,
  labelSectionClass,
  labelSectionTitleClass,
  formLabelClass,
} from '../../constants/typography';

export const PlayerStatsScreen = () => {
  const { setGameState, currentTheme, uiLanguage } = useGame();
  const { isAuthenticated } = useAuthContext();
  const { requestLogin } = useAppLogin();
  const { isTelegram } = useTelegramApp();
  const { get: getStats } = usePlayerStats();
  const stats = getStats();
  const t = useT();

  const dateLocale =
    uiLanguage === Language.UA ? 'uk-UA' : uiLanguage === Language.DE ? 'de-DE' : 'en-US';

  const accuracy =
    stats.wordsGuessed + stats.wordsSkipped > 0
      ? Math.round((stats.wordsGuessed / (stats.wordsGuessed + stats.wordsSkipped)) * 100)
      : 0;

  const rows = [
    { label: t.statsRowGamesPlayed, value: stats.gamesPlayed, icon: '🎮' },
    { label: t.statsRowWordsGuessed, value: stats.wordsGuessed, icon: '✅' },
    { label: t.statsRowWordsSkipped, value: stats.wordsSkipped, icon: '❌' },
    { label: t.statsRowAccuracy, value: `${accuracy}%`, icon: '🎯' },
  ];

  const goBack = () => {
    setGameState(isAuthenticated ? GameState.PROFILE : GameState.MENU);
  };

  return (
    <div className="flex flex-col min-h-screen items-center bg-ui-bg">
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header className="flex items-center px-6 md:px-8 pb-4 pt-safe-top gap-3">
          {!isTelegram && (
            <button
              type="button"
              onClick={goBack}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <ScreenTitle themeClass={currentTheme.textMain}>{t.statsScreenTitle}</ScreenTitle>
        </header>

        <div className="flex-1 px-6 md:px-8 py-4 space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between px-5 py-4 rounded-2xl bg-ui-card border border-ui-border"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{row.icon}</span>
                <span className={`${typographyClass.body} font-medium text-ui-fg`}>
                  {row.label}
                </span>
              </div>
              <span className={`text-xl font-bold font-serif ${currentTheme.textMain}`}>
                {row.value}
              </span>
            </div>
          ))}

          {stats.lastPlayed && (
            <p className={`text-center ${typographyClass.label} pt-4 text-ui-fg-muted opacity-70`}>
              {t.statsLastPlayedPrefix} {new Date(stats.lastPlayed).toLocaleDateString(dateLocale)}
            </p>
          )}

          {!isAuthenticated && (
            <div className="mt-6 rounded-2xl border px-5 py-4 bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)]">
              <p className={`${typographyClass.body} leading-relaxed text-ui-fg`}>
                {t.statsGuestBannerBody}
              </p>
              <button
                type="button"
                onClick={requestLogin}
                className={`mt-4 w-full py-3 rounded-xl font-sans ${typographyClass.label} tracking-[0.2em] ${currentTheme.button}`}
              >
                {t.statsGuestBannerCta}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
