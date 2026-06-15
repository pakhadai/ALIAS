import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ShoppingBag, ChevronRight, SlidersHorizontal, Lock } from 'lucide-react';
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
import { useCollapsingHeaderTitle } from '../../hooks/useCollapsingHeaderTitle';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { LogoutConfirmBottomSheet } from '../../components/Auth/LogoutConfirmBottomSheet';
import { ScreenTitle } from '../../components/typography/ScreenTitle';
import { footerIslandClassName } from '../../constants/footerLayout';
import { typographyClass } from '../../constants/typography';
import { ProfileHero } from './profile/ProfileHero';
import { ProfileGuestBenefits } from './profile/ProfileGuestBenefits';
import { ProfileBenefitsList } from './profile/ProfileBenefitsList';
import { ProfileStatsCards } from './profile/ProfileStatsCards';
import { ProfileNavList } from './profile/ProfileNavList';
import { countProfilePurchases } from './profile/profilePurchaseCounts';
import { PROFILE_NAV_BTN_CLASS } from './profile/profileSurfaceClasses';

export const ProfileScreen = () => {
  const { setGameState, currentTheme, showNotification } = useGame();
  const { authState, profile, logout } = useAuthContext();
  const { requestLogin } = useAppLogin();
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

  const handleGuestLobbySettings = useCallback(() => {
    showNotification(t.lobbyDefaultsAuthRequired, 'info');
    requestLogin();
  }, [showNotification, t.lobbyDefaultsAuthRequired, requestLogin]);

  const profileMenuItems = useMemo(
    () =>
      isGuest
        ? [
            {
              id: 'guest-reset',
              label: t.profileGuestResetMenu,
              onSelect: () => setShowLogoutConfirm(true),
            },
          ]
        : [],
    [isGuest, t.profileGuestResetMenu]
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
      },
      {
        emoji: '☁️',
        label: t.profileBenefitSyncLabel,
        sub: t.profileBenefitSyncSub,
      },
    ],
    [t]
  );

  const heroBadge = loadingAuth ? null : isGuest ? (
    <AccountBadge label={t.profileFreeAccount} />
  ) : provider ? (
    <ProviderBadge provider={provider} />
  ) : null;

  const sessionEndFooter = !loadingAuth ? (
    <FixedBottomBar island contentClassName={footerIslandClassName('narrow')}>
      {isGuest ? (
        <div className="flex w-full flex-col gap-2">
          <AccentFooterCta
            variant="plain"
            buttonTestId="profile-guest-login-btn"
            themeButtonClass={currentTheme.button}
            onClick={requestLogin}
          >
            {t.profileGuestLoginCta}
          </AccentFooterCta>
          <p className={`${typographyClass.body} text-center text-ui-fg-muted`}>
            {t.profileLoginAnchor}
          </p>
        </div>
      ) : (
        <AccentFooterCta
          variant="plain"
          buttonTestId="profile-logout-btn"
          themeButtonClass={currentTheme.button}
          onClick={() => setShowLogoutConfirm(true)}
          disabled={loggingOut}
          loading={loggingOut}
        >
          {t.profileLogout ?? 'LOG OUT'}
        </AccentFooterCta>
      )}
    </FixedBottomBar>
  ) : undefined;

  return (
    <>
      <ScreenShell
        className="relative bg-ui-bg transition-colors duration-500"
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
        />

        {isGuest ? (
          <div className="relative flex flex-1 flex-col w-full max-w-md mx-auto gap-6 pb-4">
            <ProfileGuestBenefits title={t.profileBenefitsTitle} items={guestBenefits} />

            <button
              type="button"
              onClick={handleGuestLobbySettings}
              className={`${PROFILE_NAV_BTN_CLASS} opacity-80`}
              data-testid="profile-guest-lobby-settings"
            >
              <div className="flex items-center gap-3 min-w-0">
                <SlidersHorizontal size={16} className={`${currentTheme.iconColor} opacity-60`} />
                <div className="text-left min-w-0">
                  <span
                    className={`${typographyClass.label} font-sans tracking-[0.25em] text-ui-fg-muted`}
                  >
                    {t.profileNavLobbySettings}
                  </span>
                  {t.profileNavLobbySettingsAuthSub ? (
                    <p
                      className={`${typographyClass.label} mt-0.5 tracking-widest text-ui-fg-muted`}
                    >
                      {t.profileNavLobbySettingsAuthSub}
                    </p>
                  ) : null}
                </div>
              </div>
              <Lock
                size={14}
                className={`${currentTheme.iconColor} opacity-40 shrink-0`}
                aria-hidden
              />
            </button>

            <button
              type="button"
              onClick={() => setGameState(GameState.STORE)}
              className={PROFILE_NAV_BTN_CLASS}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={16} className={currentTheme.iconColor} />
                <span className={`${typographyClass.label} font-sans tracking-[0.25em] text-ui-fg`}>
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
              onPress={goToPlayerStats}
            />

            <ProfileBenefitsList
              title={t.profilePurchasesTitle}
              subtitle={purchasesSummary}
              items={authBenefits}
            />

            <ProfileNavList
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
