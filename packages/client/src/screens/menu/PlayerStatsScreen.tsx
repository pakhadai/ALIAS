import React, { useMemo } from 'react';
import { Calendar, Cloud, XCircle } from 'lucide-react';
import { GameState, Language } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useAppLogin } from '../../context/AppLoginContext';
import { useT } from '../../hooks/useT';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { AppHeader, ScreenShell } from '../../components/layout';
import { Button } from '../../components/Button';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { typographyClass } from '../../constants/typography';
import { ProfileStatsCards } from './profile/ProfileStatsCards';
import { PlayerStatsDetailPanel } from './profile/PlayerStatsDetailPanel';

export const PlayerStatsScreen = () => {
  const { setGameState, currentTheme, uiLanguage } = useGame();
  const { isAuthenticated } = useAuthContext();
  const { requestLogin } = useAppLogin();
  const { get: getStats } = usePlayerStats();
  const stats = getStats();
  const t = useT();
  const isDark = currentTheme.isDark;

  const dateLocale =
    uiLanguage === Language.UA ? 'uk-UA' : uiLanguage === Language.DE ? 'de-DE' : 'en-US';

  const accuracy =
    stats.wordsGuessed + stats.wordsSkipped > 0
      ? Math.round((stats.wordsGuessed / (stats.wordsGuessed + stats.wordsSkipped)) * 100)
      : 0;

  const isEmpty = stats.gamesPlayed === 0 && stats.wordsGuessed === 0 && stats.wordsSkipped === 0;

  const detailRows = useMemo(() => {
    const rows = [
      {
        label: t.statsRowWordsSkipped,
        value: String(stats.wordsSkipped),
        icon: XCircle,
      },
    ];
    if (stats.lastPlayed) {
      rows.push({
        label: t.statsLastPlayedPrefix.replace(/:$/, ''),
        value: new Date(stats.lastPlayed).toLocaleDateString(dateLocale),
        icon: Calendar,
      });
    }
    return rows;
  }, [t, stats.wordsSkipped, stats.lastPlayed, dateLocale]);

  const goBack = () => {
    setGameState(isAuthenticated ? GameState.PROFILE : GameState.MENU);
  };

  const emptyPanelClass = isDark
    ? 'bg-ui-surface border-ui-border'
    : 'bg-ui-card border-ui-border shadow-sm';

  return (
    <ScreenShell
      className={`relative ${currentTheme.bg} transition-colors duration-500`}
      contentClassName="max-w-md w-full mx-auto px-6 md:px-8 flex flex-col flex-1 py-4 pb-4 gap-4"
      headerFixed
      header={
        <AppHeader
          fixed
          title={<ScreenTitle themeClass={currentTheme.textMain}>{t.statsScreenTitle}</ScreenTitle>}
          onBack={goBack}
          backAriaLabel={t.goBack}
          data-testid="player-stats-header-title"
        />
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden
        style={{
          backgroundImage: 'radial-gradient(var(--ui-fg) 0.5px, transparent 0.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative flex flex-col gap-4">
        <ProfileStatsCards
          gamesPlayed={stats.gamesPlayed}
          wordsGuessed={stats.wordsGuessed}
          accuracy={accuracy}
          labels={{
            games: t.profileStatsCardGames,
            guessed: t.profileStatsCardGuessed,
            accuracy: t.profileStatsCardAccuracy,
            tapForDetails: t.profileTapForDetails,
          }}
          isDark={isDark}
          themeTextMain={currentTheme.textMain}
          themeTextSecondary={currentTheme.textSecondary}
        />

        {isEmpty ? (
          <div
            className={`w-full rounded-3xl border px-5 py-6 text-center ${emptyPanelClass}`}
            data-testid="player-stats-empty"
          >
            <p className={`${typographyClass.heading} ${currentTheme.textMain}`}>
              {t.statsEmptyTitle}
            </p>
            <p
              className={`${typographyClass.body} mt-2 leading-relaxed ${currentTheme.textSecondary}`}
            >
              {t.statsEmptyBody}
            </p>
            <Button
              type="button"
              fullWidth
              themeClass={currentTheme.button}
              className="mt-5 min-h-[52px] rounded-full tracking-[0.2em]"
              onClick={() => setGameState(GameState.MENU)}
            >
              {t.statsEmptyCta}
            </Button>
          </div>
        ) : (
          <PlayerStatsDetailPanel
            title={t.statsSectionDetails}
            rows={detailRows}
            isDark={isDark}
            themeTextMain={currentTheme.textMain}
            themeIconColor={currentTheme.iconColor}
          />
        )}

        {isAuthenticated ? (
          <div
            className={`flex items-center justify-center gap-2 ${typographyClass.body} ${currentTheme.textSecondary}`}
            data-testid="player-stats-synced"
          >
            <Cloud size={16} className={currentTheme.iconColor} aria-hidden />
            <span>{t.statsSyncedBadge}</span>
          </div>
        ) : (
          <div className="rounded-2xl border px-5 py-4 bg-[color-mix(in_srgb,var(--ui-accent)_12%,transparent)] border-[color-mix(in_srgb,var(--ui-accent)_25%,transparent)]">
            <p className={`${typographyClass.body} leading-relaxed text-ui-fg`}>
              {t.statsGuestBannerBody}
            </p>
            <Button
              type="button"
              fullWidth
              themeClass={currentTheme.button}
              className="mt-4 min-h-[48px] rounded-xl tracking-[0.2em]"
              onClick={requestLogin}
            >
              {t.statsGuestBannerCta}
            </Button>
          </div>
        )}
      </div>
    </ScreenShell>
  );
};
