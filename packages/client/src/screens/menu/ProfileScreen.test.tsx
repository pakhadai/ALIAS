import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameState } from '../../types';
import { ProfileScreen } from './ProfileScreen';

const setGameState = vi.fn();
const showNotification = vi.fn();
const requestLogin = vi.fn();
const logout = vi.fn();

const getStats = vi.fn(() => ({
  gamesPlayed: 5,
  wordsGuessed: 40,
  wordsSkipped: 10,
  lastPlayed: '2026-06-01T12:00:00.000Z',
}));

const authContextValue: {
  authState:
    | { status: 'anonymous' }
    | { status: 'authenticated'; email: string; provider: string; isAdmin?: boolean };
  profile: {
    name?: string;
    displayName?: string;
    avatarId?: string | null;
    purchases?: Array<{ wordPack?: { slug: string } | null; theme?: { slug: string } | null }>;
    isAdmin?: boolean;
  } | null;
  logout: typeof logout;
} = {
  authState: { status: 'anonymous' },
  profile: null,
  logout,
};

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    showNotification,
    currentTheme: {
      bg: 'bg-ui-bg',
      card: 'bg-ui-card',
      textMain: 'text-ui-fg',
      button: 'bg-ui-accent text-ui-accent-contrast',
      iconColor: 'text-ui-fg-muted',
      isDark: true,
    },
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => authContextValue,
}));

vi.mock('../../context/AppLoginContext', () => ({
  useAppLogin: () => ({ requestLogin }),
}));

vi.mock('../../hooks/usePlayerStats', () => ({
  usePlayerStats: () => ({ get: getStats }),
}));

vi.mock('../../hooks/useTelegramApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTelegramApp')>();
  return {
    ...actual,
    useTelegramApp: () => ({ ...actual.useTelegramApp(), isTelegram: false }),
  };
});

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    profileAnonymous: 'Guest',
    profileFreeAccount: 'Free account',
    profileGuestReset: 'Reset session',
    profileGuestResetMenu: 'Reset session',
    profileGuestLoginCta: 'Sign in / Register',
    profileLogout: 'Log out',
    profileLoginAnchor: 'Sign in to sync purchases',
    loginGoogle: 'Sign in with Google',
    profileBenefitsTitle: 'Benefits',
    profileBenefitCustomListsLabel: 'Custom lists',
    profileBenefitCustomListsSub: 'Create your own packs',
    profileBenefitWordPacksLabelZero: 'Word packs',
    profileBenefitWordPacksSub: 'Extra categories',
    profileBenefitVisualThemesLabelZero: 'Visual themes',
    profileBenefitVisualThemesSub: 'New looks',
    profileBenefitGameStatsLabel: 'Game stats',
    profileBenefitGameStatsSub: 'Track progress',
    profileBenefitSyncLabel: 'Cloud sync',
    profileBenefitSyncSub: 'Across devices',
    profileNavLobbySettings: 'Lobby settings',
    profileNavLobbySettingsAuthSub: 'Sign in required',
    profileGuestBrowseStore: 'Browse store',
    lobbyDefaultsAuthRequired: 'Sign in to save lobby defaults',
    profileStatsCardGames: 'Played',
    profileStatsCardGuessed: 'Guessed',
    profileStatsCardAccuracy: 'Accuracy',
    profileTapForDetails: 'Tap for details',
    profilePurchasesTitle: 'Purchases',
    profilePurchasesSummary: '{0} packs · {1} themes',
    profileBenefitWordPacksLabel: '{0} packs',
    profileBenefitVisualThemesLabel: '{0} themes',
    profileBenefitAuthCustomListsActiveSub: 'Active',
    profileNavUnlockPacksSub: 'Available in the store',
    profileBenefitAuthSyncSub: 'Synced',
    profileSectionGame: 'GAME',
    profileSectionSettings: 'SETTINGS',
    profileSectionExtra: 'EXTRA',
    profileNavMyStats: 'My statistics',
    profileNavMyPacks: 'My word packs',
    profileNavUnlockPacks: 'Unlock custom packs',
    profileNavProfileSettings: 'Profile settings',
    profileNavLobbySettingsSub: 'Defaults for new games',
    profileNavStore: 'Store',
    profileAdminPanel: 'Admin panel',
    profileGuestResetConfirmTitle: 'Reset session?',
    profileLogoutConfirmTitle: 'Log out?',
    profileLogoutCancel: 'Cancel',
    profileGuestResetConfirm: 'Reset',
    profileLogoutConfirm: 'Log out',
    profileGuestResetLoading: 'Resetting…',
    profileLogoutLoading: 'Logging out…',
    cancel: 'Cancel',
  }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authContextValue.authState = { status: 'anonymous' };
    authContextValue.profile = null;
    getStats.mockReturnValue({
      gamesPlayed: 5,
      wordsGuessed: 40,
      wordsSkipped: 10,
      lastPlayed: '2026-06-01T12:00:00.000Z',
    });
    logout.mockResolvedValue(undefined);
  });

  it('should show guest login CTA in footer and browse store navigation', async () => {
    render(<ProfileScreen />);

    expect(screen.getByTestId('profile-guest-login-btn')).toHaveTextContent('Sign in / Register');
    expect(screen.getByText('Sign in to sync purchases')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-guest-reset-btn')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('profile-guest-login-btn'));
    expect(requestLogin).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByText('Browse store'));
    expect(setGameState).toHaveBeenCalledWith(GameState.STORE);
  });

  it('should open reset session confirm from overflow menu for guests', async () => {
    render(<ProfileScreen />);

    await userEvent.click(screen.getByTestId('app-header-menu'));
    await userEvent.click(screen.getByTestId('app-header-menu-item-guest-reset'));

    expect(screen.getByRole('heading', { name: 'Reset session?' })).toBeInTheDocument();
  });

  it('should gate guest lobby settings behind login', async () => {
    render(<ProfileScreen />);

    await userEvent.click(screen.getByTestId('profile-guest-lobby-settings'));

    expect(showNotification).toHaveBeenCalledWith('Sign in to save lobby defaults', 'info');
    expect(requestLogin).toHaveBeenCalledOnce();
  });

  it('should render auth stats cards and navigate to profile settings', async () => {
    authContextValue.authState = {
      status: 'authenticated',
      email: 'player@example.com',
      provider: 'google',
    };
    authContextValue.profile = {
      name: 'Player',
      displayName: 'Player',
      avatarId: '0',
      purchases: [],
    };

    render(<ProfileScreen />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Played')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Profile settings'));
    expect(setGameState).toHaveBeenCalledWith(GameState.PROFILE_SETTINGS);
  });
});
