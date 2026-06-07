import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Settings,
  ShoppingBag,
  ChevronRight,
  BookOpen,
  Lock,
  Shield,
  Loader2,
} from 'lucide-react';
import { AvatarDisplay } from '../../components/AvatarDisplay';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useAppLogin } from '../../context/AppLoginContext';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useT } from '../../hooks/useT';
import { useTelegramApp } from '../../hooks/useTelegramApp';
import { LogoutConfirmBottomSheet } from '../../components/Auth/LogoutConfirmBottomSheet';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { typographyClass, labelSectionTitleClass } from '../../constants/typography';

export function ProviderBadge({ provider }: { provider: string }) {
  const label =
    provider === 'google' ? 'GOOGLE' : provider === 'apple' ? 'APPLE' : provider.toUpperCase();
  return (
    <span
      className={`bg-ui-accent text-ui-accent-contrast ${typographyClass.label} tracking-[0.18em] px-3 py-[3px] rounded-full shadow-md`}
    >
      {label}
    </span>
  );
}

function GuestAccountBadge({ label }: { label: string }) {
  return (
    <span
      className={`bg-ui-accent text-ui-accent-contrast ${typographyClass.label} tracking-[0.18em] px-3 py-[3px] rounded-full shadow-md`}
    >
      {label}
    </span>
  );
}

const statCardInteractive = `rounded-2xl px-4 py-4 text-left border border-ui-border transition-all duration-200
  group-hover:border-ui-accent/50 group-hover:bg-[color-mix(in_srgb,var(--ui-accent)_6%,var(--ui-surface))]
  group-active:scale-[0.98]`;

export const ProfileScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const { authState, profile, logout } = useAuthContext();
  const { requestLogin } = useAppLogin();
  const { isTelegram } = useTelegramApp();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isDark = currentTheme.isDark;
  const { get: getStats } = usePlayerStats();
  const t = useT();

  const loadingAuth = authState.status === 'loading';
  const isGuest = authState.status === 'anonymous';
  const email = authState.status === 'authenticated' ? authState.email : '';
  const provider = authState.status === 'authenticated' ? authState.provider : '';

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setGameState(GameState.MENU);
  };

  const profileDisplayName = profile?.displayName;
  const displayName =
    profile?.name ??
    profileDisplayName ??
    (loadingAuth
      ? '…'
      : isGuest
        ? t.profileAnonymous
        : authState.status === 'authenticated'
          ? authState.email?.split('@')[0]
          : '');
  const guestSub = loadingAuth ? '' : isGuest ? t.profileGuestUser : email;

  const hasCustomPacks =
    profile?.purchases?.some((p) => p.wordPack?.slug === 'feature-custom-packs') ?? false;

  const stats = getStats();
  const accuracy =
    stats.wordsGuessed + stats.wordsSkipped > 0
      ? Math.round((stats.wordsGuessed / (stats.wordsGuessed + stats.wordsSkipped)) * 100)
      : 0;

  const navBtn = `w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 ease-out active:scale-95 hover:-translate-y-0.5 will-change-transform ${
    isDark
      ? 'bg-ui-surface border border-ui-border hover:bg-ui-surface-hover'
      : 'bg-ui-card border border-ui-border hover:bg-ui-surface-hover shadow-sm'
  }`;
  const navLabel = `${typographyClass.label} font-sans tracking-[0.25em] ${currentTheme.textMain}`;
  const sectionTitle = labelSectionTitleClass;

  const showAdminEntry =
    authState.status === 'authenticated' && (authState.isAdmin || (profile?.isAdmin ?? false));

  const openAdminPanel = () => {
    window.location.href = '/admin.html';
  };

  /** Marketing bullets for guests — static copy (no store fetch, avoids “0 packs” flash). */
  const guestBenefits: { emoji: string; label: string; sub: string }[] = useMemo(
    () => [
      {
        emoji: '📝',
        label: t.profileBenefitCustomListsLabel,
        sub: t.profileBenefitCustomListsSub,
      },
      {
        emoji: '📦',
        label: t.profileBenefitWordPacksLabelZero,
        sub: t.profileBenefitWordPacksSub,
      },
      {
        emoji: '🎨',
        label: t.profileBenefitVisualThemesLabelZero,
        sub: t.profileBenefitVisualThemesSub,
      },
      {
        emoji: '📊',
        label: t.profileBenefitGameStatsLabel,
        sub: t.profileBenefitGameStatsSub,
      },
      {
        emoji: '☁️',
        label: t.profileBenefitSyncLabel,
        sub: t.profileBenefitSyncSub,
      },
    ],
    [t]
  );

  return (
    <div
      className={`flex flex-col min-h-screen items-center ${currentTheme.bg} transition-colors duration-500`}
    >
      <div className="max-w-2xl w-full flex-1 flex flex-col">
        <header className="flex items-center px-6 pb-4 pt-safe-top md:px-8">
          {!isTelegram && (
            <button
              type="button"
              onClick={() => setGameState(GameState.MENU)}
              className={`p-2 transition-all active:scale-90 ${currentTheme.iconColor} opacity-50 hover:opacity-100`}
            >
              <ArrowLeft size={22} />
            </button>
          )}
        </header>

        {/* HERO */}
        <section className="flex flex-col items-center px-6 md:px-8 pt-2 pb-6">
          <AvatarDisplay
            avatarId={profile?.avatarId}
            imageUrl={profile?.avatarId ? null : profile?.avatarUrl}
            name={displayName}
            size={96}
          />
          <ScreenTitle as="h1" themeClass={currentTheme.textMain} className="mt-5">
            {displayName}
          </ScreenTitle>
          {guestSub && (
            <p className={`${typographyClass.body} mt-1 mb-2 ${currentTheme.textSecondary}`}>
              {guestSub}
            </p>
          )}
          {!loadingAuth && isGuest ? (
            <GuestAccountBadge label={t.profileFreeAccount} />
          ) : provider ? (
            <ProviderBadge provider={provider} />
          ) : null}
        </section>

        {isGuest && !isTelegram && (
          <div className="px-6 md:px-8 pb-6 flex flex-col items-center">
            <button
              type="button"
              onClick={requestLogin}
              className={`w-full max-w-[320px] min-h-[44px] rounded-xl font-sans text-xs font-bold uppercase tracking-[0.2em] ${currentTheme.button}`}
            >
              {t.loginGoogle}
            </button>
          </div>
        )}

        {isGuest && (
          <>
            <div className="h-px w-[calc(100%-3rem)] max-w-md mx-auto bg-ui-border" />
            <div className="px-6 md:px-8 py-5">
              <p className={`${sectionTitle} mb-3`}>{t.profileBenefitsTitle}</p>
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {guestBenefits.slice(0, 4).map((item, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border border-ui-border p-4 ${
                      isDark ? 'bg-ui-surface' : 'bg-ui-card shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{item.emoji}</span>
                      <p
                        className={`${typographyClass.label} font-sans tracking-[0.18em] text-ui-fg line-clamp-2`}
                      >
                        {item.label}
                      </p>
                    </div>
                    <p
                      className={`${typographyClass.label} font-sans mt-2 leading-snug text-ui-fg-muted normal-case line-clamp-3`}
                    >
                      {item.sub}
                    </p>
                  </div>
                ))}
              </div>
              {guestBenefits[4] && (
                <div
                  className={`mt-3 max-w-md mx-auto rounded-2xl border border-ui-border p-4 ${
                    isDark ? 'bg-ui-surface' : 'bg-ui-card shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg leading-none">{guestBenefits[4].emoji}</span>
                    <p
                      className={`${typographyClass.label} font-sans tracking-[0.18em] text-ui-fg line-clamp-2`}
                    >
                      {guestBenefits[4].label}
                    </p>
                  </div>
                  <p
                    className={`${typographyClass.label} font-sans mt-2 leading-snug text-ui-fg-muted normal-case line-clamp-3`}
                  >
                    {guestBenefits[4].sub}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="h-px w-[calc(100%-3rem)] max-w-md mx-auto bg-ui-border" />

        {/* STATS → details */}
        <section className="px-6 md:px-8 pt-6 pb-2">
          <button
            type="button"
            onClick={() => setGameState(GameState.PLAYER_STATS)}
            className="group w-full max-w-md mx-auto block text-left rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ui-accent focus-visible:ring-offset-2 focus-visible:ring-offset-(--ui-bg)"
          >
            <div className="grid grid-cols-3 gap-3">
              <div
                className={`${statCardInteractive} ${isDark ? 'bg-ui-surface' : 'bg-ui-card shadow-sm'}`}
              >
                <p className={`${labelSectionTitleClass} text-ui-fg-muted !opacity-100`}>
                  {t.profileStatsCardGames ?? t.statsRowGamesPlayed ?? 'Played'}
                </p>
                <p className={`mt-1 font-serif text-xl ${currentTheme.textMain}`}>
                  {stats.gamesPlayed}
                </p>
              </div>
              <div
                className={`${statCardInteractive} ${isDark ? 'bg-ui-surface' : 'bg-ui-card shadow-sm'}`}
              >
                <p className={`${labelSectionTitleClass} text-ui-fg-muted !opacity-100`}>
                  {t.profileStatsCardGuessed ?? t.statsRowWordsGuessed ?? 'Guessed'}
                </p>
                <p className={`mt-1 font-serif text-xl ${currentTheme.textMain}`}>
                  {stats.wordsGuessed}
                </p>
              </div>
              <div
                className={`${statCardInteractive} ${isDark ? 'bg-ui-surface' : 'bg-ui-card shadow-sm'}`}
              >
                <p className={`${labelSectionTitleClass} text-ui-fg-muted !opacity-100`}>
                  {t.profileStatsCardAccuracy ?? t.statsRowAccuracy ?? 'Accuracy'}
                </p>
                <p className={`mt-1 font-serif text-xl ${currentTheme.textMain}`}>{accuracy}%</p>
              </div>
            </div>
            <p
              className={`mt-3 text-center ${typographyClass.label} tracking-[0.35em] text-ui-fg-muted group-hover:text-ui-accent transition-colors`}
            >
              {t.profileTapForDetails ?? 'Tap for details'}
            </p>
          </button>
        </section>

        <div className="h-px w-[calc(100%-3rem)] max-w-md mx-auto bg-ui-border mt-4" />

        <div className="flex-1 px-6 md:px-8 space-y-6 pt-6">
          <div>
            <p className={sectionTitle}>{t.profileSectionGame ?? t.game ?? 'GAME'}</p>
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={() =>
                  hasCustomPacks
                    ? setGameState(GameState.MY_WORD_PACKS)
                    : setGameState(GameState.STORE)
                }
                className={navBtn}
              >
                <div className="flex items-center gap-3">
                  <BookOpen
                    size={16}
                    className={
                      hasCustomPacks
                        ? currentTheme.iconColor
                        : 'text-[color-mix(in_srgb,var(--ui-accent)_78%,var(--ui-accent-contrast)_22%)]'
                    }
                  />
                  <div className="text-left">
                    <span className={navLabel}>
                      {hasCustomPacks
                        ? (t.profileNavMyPacks ?? 'My word packs')
                        : (t.profileNavUnlockPacks ?? 'Unlock custom packs')}
                    </span>
                    {!hasCustomPacks && (
                      <p
                        className={`${typographyClass.label} mt-0.5 tracking-widest text-ui-fg-muted`}
                      >
                        {t.profileNavUnlockPacksSub ?? 'Available in the store'}
                      </p>
                    )}
                  </div>
                </div>
                {hasCustomPacks ? (
                  <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
                ) : (
                  <Lock
                    size={14}
                    className="text-[color-mix(in_srgb,var(--ui-accent)_78%,var(--ui-accent-contrast)_22%)]"
                  />
                )}
              </button>
            </div>
          </div>

          <div>
            <p className={sectionTitle}>{t.profileSectionSettings ?? t.settings ?? 'SETTINGS'}</p>
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={() => setGameState(GameState.PROFILE_SETTINGS)}
                className={navBtn}
              >
                <div className="flex items-center gap-3">
                  <Settings size={16} className={currentTheme.iconColor} />
                  <span className={navLabel}>
                    {t.profileNavProfileSettings ?? 'Profile settings'}
                  </span>
                </div>
                <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
              </button>

              <button
                type="button"
                onClick={() => setGameState(GameState.LOBBY_SETTINGS)}
                className={navBtn}
              >
                <div className="flex items-center gap-3">
                  <Settings size={16} className={currentTheme.iconColor} />
                  <span className={navLabel}>{t.profileNavLobbySettings ?? 'Lobby settings'}</span>
                </div>
                <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
              </button>

              <button
                type="button"
                onClick={() => setGameState(GameState.STORE)}
                className={`${navBtn} ${currentTheme.button}`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag size={16} />
                  <span className={`${typographyClass.label} font-sans tracking-[0.25em]`}>
                    {t.profileNavStore ?? t.store ?? 'Store'}
                  </span>
                </div>
                <ChevronRight size={16} className="opacity-60" />
              </button>
            </div>
          </div>

          {showAdminEntry && (
            <button type="button" onClick={openAdminPanel} className={navBtn}>
              <div className="flex items-center gap-3">
                <Shield size={16} className="text-ui-accent" strokeWidth={2.25} aria-hidden />
                <span className={navLabel}>{t.profileAdminPanel}</span>
              </div>
              <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
            </button>
          )}
        </div>

        <div className="px-6 md:px-8 pt-6 pb-safe-bottom">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            disabled={loggingOut}
            className={`w-full text-center text-ui-danger font-sans ${typographyClass.label} tracking-[0.3em] py-3 hover:opacity-70 active:scale-[0.98] transition-all disabled:opacity-30`}
          >
            {loggingOut ? (
              <Loader2 size={14} className="animate-spin inline" />
            ) : (
              (t.profileLogout ?? 'LOG OUT')
            )}
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <LogoutConfirmBottomSheet
          titleId="profile-screen-logout-confirm"
          onDismiss={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          loggingOut={loggingOut}
          title={t.profileLogoutConfirmTitle ?? 'Are you sure you want to log out?'}
          cancelLabel={t.profileLogoutCancel ?? t.cancel ?? 'Cancel'}
          confirmLabel={t.profileLogoutConfirm ?? 'Log out'}
          loadingLabel={t.profileLogoutLoading ?? 'Logging out...'}
        />
      )}
    </div>
  );
};
