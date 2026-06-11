import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ShoppingBag, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { AccountBadge, ProviderBadge } from '../../components/Auth/AccountBadge';
import {
  AccentFooterCta,
  AppHeader,
  FixedBottomBar,
  SCREEN_ACCENT_GLOW_FOCAL,
  ScreenAccentGlow,
  ScreenShell,
} from '../../components/layout';
import { GameState } from '../../types';
import { useGame } from '../../context/GameContext';
import { useAuthContext } from '../../context/AuthContext';
import { useAppLogin } from '../../context/AppLoginContext';
import { useT } from '../../hooks/useT';
import { useTelegramApp } from '../../hooks/useTelegramApp';
import { useCollapsingHeaderTitle } from '../../hooks/useCollapsingHeaderTitle';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { LogoutConfirmBottomSheet } from '../../components/Auth/LogoutConfirmBottomSheet';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { typographyClass } from '../../constants/typography';
import { ProfileHero } from './profile/ProfileHero';
import { ProfileGuestBenefits } from './profile/ProfileGuestBenefits';
import { ProfileBenefitsList } from './profile/ProfileBenefitsList';
import { ProfileStatsCards } from './profile/ProfileStatsCards';
import { ProfileNavList } from './profile/ProfileNavList';
import { countProfilePurchases } from './profile/profilePurchaseCounts';
import { PROFILE_NAV_BTN_CLASS } from './profile/profileSurfaceClasses';

export const ProfileScreen = () => {
  const { setGameState, currentTheme } = useGame();
  const { authState, profile, logout } = useAuthContext();
  const { requestLogin } = useAppLogin();
  const { isTelegram } = useTelegramApp();
  const { get: getStats } = usePlayerStats();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const heroTitleRef = useRef<HTMLDivElement>(null);
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
          ? (authState.email?.split('@')[0] ?? t.profileAnonymous)
          : '');

  const heroSubtitle = loadingAuth || isGuest ? undefined : email || undefined;
  const showHeaderTitle = useCollapsingHeaderTitle(heroTitleRef, !loadingAuth);

  const purchaseCounts = useMemo(
    () => countProfilePurchases(profile?.purchases),
    [profile?.purchases]
  );
  const hasCustomPacks = purchaseCounts.hasCustomPacks;

  const playerStats = getStats();
  const statsAccuracy =
    playerStats.wordsGuessed + playerStats.wordsSkipped > 0
      ? Math.round(
          (playerStats.wordsGuessed / (playerStats.wordsGuessed + playerStats.wordsSkipped)) * 100
        )
      : 0;

  const purchasesSummary =
    purchaseCounts.wordPacks > 0 || purchaseCounts.themes > 0
      ? t.profilePurchasesSummary
          .replace('{0}', String(purchaseCounts.wordPacks))
          .replace('{1}', String(purchaseCounts.themes))
      : undefined;

  const goToPlayerStats = useCallback(() => setGameState(GameState.PLAYER_STATS), [setGameState]);

  const profileMenuItems = useMemo(
    () => [
      { id: '1', label: 'Пункт 1', onSelect: () => console.log('profile menu: item 1') },
      { id: '2', label: 'Пункт 2', onSelect: () => console.log('profile menu: item 2') },
      { id: '3', label: 'Пункт 3', onSelect: () => console.log('profile menu: item 3') },
    ],
    []
  );

  const authBenefits = useMemo(
    () => [
      {
        emoji: '📦',
        label:
          purchaseCounts.wordPacks > 0
            ? t.profileBenefitWordPacksLabel.replace('{0}', String(purchaseCounts.wordPacks))
            : t.profileBenefitWordPacksLabelZero,
        sub: t.profileBenefitWordPacksSub,
      },
      {
        emoji: '🎨',
        label:
          purchaseCounts.themes > 0
            ? t.profileBenefitVisualThemesLabel.replace('{0}', String(purchaseCounts.themes))
            : t.profileBenefitVisualThemesLabelZero,
        sub: t.profileBenefitVisualThemesSub,
      },
      {
        emoji: '📝',
        label: t.profileBenefitCustomListsLabel,
        sub: purchaseCounts.hasCustomPacks
          ? t.profileBenefitAuthCustomListsActiveSub
          : (t.profileNavUnlockPacksSub ?? 'Available in the store'),
      },
      {
        emoji: '☁️',
        label: t.profileBenefitSyncLabel,
        sub: t.profileBenefitAuthSyncSub,
      },
    ],
    [t, purchaseCounts]
  );

  const showAdminEntry =
    authState.status === 'authenticated' && (authState.isAdmin || (profile?.isAdmin ?? false));

  const guestBenefits = useMemo(
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
        onPress: goToPlayerStats,
      },
      {
        emoji: '☁️',
        label: t.profileBenefitSyncLabel,
        sub: t.profileBenefitSyncSub,
      },
    ],
    [t, goToPlayerStats]
  );

  const heroBadge = loadingAuth ? null : isGuest ? (
    <AccountBadge label={t.profileFreeAccount} />
  ) : provider ? (
    <ProviderBadge provider={provider} />
  ) : null;

  const sessionEndFooter = !loadingAuth ? (
    <FixedBottomBar island contentClassName="max-w-sm mx-auto w-full">
      <AccentFooterCta
        variant="plain"
        buttonTestId={isGuest ? 'profile-guest-reset-btn' : 'profile-logout-btn'}
        themeButtonClass={currentTheme.button}
        onClick={() => setShowLogoutConfirm(true)}
        disabled={loggingOut}
        loading={loggingOut}
      >
        {isGuest ? t.profileGuestReset : (t.profileLogout ?? 'LOG OUT')}
      </AccentFooterCta>
    </FixedBottomBar>
  ) : undefined;

  return (
    <>
      <ScreenShell
        className={`relative ${currentTheme.bg} transition-colors duration-500`}
        layout="canonical"
        contentClassName="flex flex-col flex-1"
        headerFixed
        footerFixed={!loadingAuth}
        header={
          <AppHeader
            fixed
            onBack={() => setGameState(GameState.MENU)}
            menuItems={profileMenuItems}
            title={
              <ScreenTitle
                as="p"
                themeClass={currentTheme.textMain}
                className={`truncate max-w-full transition-opacity duration-200 ${
                  showHeaderTitle ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {displayName}
              </ScreenTitle>
            }
          />
        }
        footer={sessionEndFooter}
      >
        <ScreenAccentGlow focalY={SCREEN_ACCENT_GLOW_FOCAL.profileHero} />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          aria-hidden
          style={{
            backgroundImage: 'radial-gradient(var(--ui-fg) 0.5px, transparent 0.5px)',
            backgroundSize: '20px 20px',
          }}
        />

        <ProfileHero
          displayName={displayName}
          subtitle={heroSubtitle}
          badge={heroBadge}
          avatarId={profile?.avatarId}
          avatarUrl={profile?.avatarId ? null : profile?.avatarUrl}
          titleRef={heroTitleRef}
          themeTextMain={currentTheme.textMain}
          themeTextSecondary={currentTheme.textSecondary}
        />

        {isGuest ? (
          <div className="relative flex flex-1 flex-col w-full max-w-md mx-auto gap-6 pb-4">
            {!isTelegram && (
              <div className="flex flex-col items-stretch gap-3">
                <button
                  type="button"
                  onClick={requestLogin}
                  className={`relative w-full min-h-[52px] overflow-hidden rounded-full flex items-center justify-center gap-2 transition-all duration-200 ease-out active:scale-[0.98] shadow-lg ${currentTheme.button}`}
                >
                  <span
                    className="absolute inset-0 opacity-60"
                    style={{
                      background:
                        'radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, var(--ui-accent) 28%, transparent) 0%, transparent 60%)',
                    }}
                    aria-hidden
                  />
                  <span className={`relative ${typographyClass.label} font-sans tracking-[0.2em]`}>
                    {t.loginGoogle}
                  </span>
                </button>
                <p className={`${typographyClass.body} text-center ${currentTheme.textSecondary}`}>
                  {t.profileLoginAnchor}
                </p>
              </div>
            )}

            {isTelegram && !loadingAuth && (
              <p
                className={`${typographyClass.body} text-center leading-relaxed ${currentTheme.textSecondary}`}
              >
                {t.profileLoginAnchor}
              </p>
            )}

            <ProfileGuestBenefits
              title={t.profileBenefitsTitle}
              items={guestBenefits}
              themeTextSecondary={currentTheme.textSecondary}
            />

            <button
              type="button"
              onClick={() => setGameState(GameState.LOBBY_SETTINGS)}
              className={PROFILE_NAV_BTN_CLASS}
              data-testid="profile-guest-lobby-settings"
            >
              <div className="flex items-center gap-3 min-w-0">
                <SlidersHorizontal size={16} className={currentTheme.iconColor} />
                <div className="text-left min-w-0">
                  <span
                    className={`${typographyClass.label} font-sans tracking-[0.25em] ${currentTheme.textMain}`}
                  >
                    {t.profileNavLobbySettings}
                  </span>
                  {t.profileNavLobbySettingsSub ? (
                    <p
                      className={`${typographyClass.label} mt-0.5 tracking-widest text-ui-fg-muted`}
                    >
                      {t.profileNavLobbySettingsSub}
                    </p>
                  ) : null}
                </div>
              </div>
              <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30 shrink-0`} />
            </button>

            <button
              type="button"
              onClick={() => setGameState(GameState.STORE)}
              className={PROFILE_NAV_BTN_CLASS}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={16} className={currentTheme.iconColor} />
                <span
                  className={`${typographyClass.label} font-sans tracking-[0.25em] ${currentTheme.textMain}`}
                >
                  {t.profileGuestBrowseStore}
                </span>
              </div>
              <ChevronRight size={16} className={`${currentTheme.iconColor} opacity-30`} />
            </button>
          </div>
        ) : (
          <div className="relative flex flex-1 flex-col w-full max-w-md mx-auto gap-6 pb-4">
            <ProfileStatsCards
              gamesPlayed={playerStats.gamesPlayed}
              wordsGuessed={playerStats.wordsGuessed}
              accuracy={statsAccuracy}
              labels={{
                games: t.profileStatsCardGames,
                guessed: t.profileStatsCardGuessed,
                accuracy: t.profileStatsCardAccuracy,
                tapForDetails: t.profileTapForDetails,
              }}
              themeTextMain={currentTheme.textMain}
              themeTextSecondary={currentTheme.textSecondary}
              onPress={goToPlayerStats}
            />

            <ProfileBenefitsList
              title={t.profilePurchasesTitle}
              subtitle={purchasesSummary}
              items={authBenefits}
              themeTextSecondary={currentTheme.textSecondary}
            />

            <ProfileNavList
              themeTextMain={currentTheme.textMain}
              themeIconColor={currentTheme.iconColor}
              themeButtonClass={currentTheme.button}
              hasCustomPacks={hasCustomPacks}
              showAdminEntry={showAdminEntry}
              labels={{
                sectionGame: t.profileSectionGame,
                sectionSettings: t.profileSectionSettings,
                sectionExtra: t.profileSectionExtra,
                myStats: t.profileNavMyStats,
                myPacks: t.profileNavMyPacks ?? 'My word packs',
                unlockPacks: t.profileNavUnlockPacks ?? 'Unlock custom packs',
                unlockPacksSub: t.profileNavUnlockPacksSub ?? 'Available in the store',
                profileSettings: t.profileNavProfileSettings ?? 'Profile settings',
                lobbySettings: t.profileNavLobbySettings ?? 'Lobby settings',
                lobbySettingsSub: t.profileNavLobbySettingsSub,
                store: t.profileNavStore ?? t.store ?? 'Store',
                adminPanel: t.profileAdminPanel,
              }}
              onMyStats={goToPlayerStats}
              onMyPacks={() =>
                setGameState(hasCustomPacks ? GameState.MY_WORD_PACKS : GameState.STORE)
              }
              onProfileSettings={() => setGameState(GameState.PROFILE_SETTINGS)}
              onLobbySettings={() => setGameState(GameState.LOBBY_SETTINGS)}
              onStore={() => setGameState(GameState.STORE)}
              onAdminPanel={() => {
                window.location.href = '/admin.html';
              }}
            />
          </div>
        )}
      </ScreenShell>

      {showLogoutConfirm && (
        <LogoutConfirmBottomSheet
          titleId="profile-screen-logout-confirm"
          onDismiss={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
          loggingOut={loggingOut}
          title={
            isGuest
              ? (t.profileGuestResetConfirmTitle ?? t.profileLogoutConfirmTitle)
              : (t.profileLogoutConfirmTitle ?? 'Are you sure you want to log out?')
          }
          cancelLabel={t.profileLogoutCancel ?? t.cancel ?? 'Cancel'}
          confirmLabel={
            isGuest
              ? (t.profileGuestResetConfirm ?? t.profileLogoutConfirm)
              : (t.profileLogoutConfirm ?? 'Log out')
          }
          loadingLabel={
            isGuest
              ? (t.profileGuestResetLoading ?? t.profileLogoutLoading)
              : (t.profileLogoutLoading ?? 'Logging out...')
          }
          solidDanger={isGuest}
        />
      )}
    </>
  );
};
