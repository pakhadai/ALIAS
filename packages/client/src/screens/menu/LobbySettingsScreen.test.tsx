import React from 'react';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackNavigationGuardProvider } from '../../context/BackNavigationGuardContext';
import {
  APP_HEADER_DOCUMENT_FLAG,
  UI_APP_HEADER_FIXED_CLASS,
} from '../../components/layout/GlassAppHeader';
import { FOOTER_ISLAND_DOCUMENT_FLAG } from '../../components/layout/FooterIsland';
import { LobbySettingsScreen } from './LobbySettingsScreen';
import type { GameSettings } from '../../types';

function renderLobbySettings() {
  return render(
    <BackNavigationGuardProvider>
      <LobbySettingsScreen />
    </BackNavigationGuardProvider>
  );
}

const setGameState = vi.fn();
const showNotification = vi.fn();
const requestLogin = vi.fn();

const fetchLobbySettings = vi.fn();
const saveLobbySettings = vi.fn();

type TestAuthState =
  | { status: 'authenticated'; email: string; provider: string }
  | { status: 'anonymous'; userId: string; profile: null };

const authContextValue: { authState: TestAuthState } = {
  authState: { status: 'authenticated', email: 'player@example.com', provider: 'google' },
};

vi.mock('../../services/api', async () => {
  return {
    fetchLobbySettings: (...args: unknown[]) => fetchLobbySettings(...args),
    saveLobbySettings: (...args: unknown[]) => saveLobbySettings(...args),
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => authContextValue,
}));

vi.mock('../../context/AppLoginContext', () => ({
  useAppLogin: () => ({ requestLogin }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    profileNavLobbySettings: 'Lobby settings',
    lobbyDefaultsGuestBannerBody: 'Settings are saved on this device. Sign in to sync.',
    statsGuestBannerCta: 'Sign in',
    lobbyDefaultsInfoBanner:
      'Default settings for new games. Applied when you create a room; the current game is not changed.',
    lobbyDefaultsSave: 'Save as defaults',
    lobbyDefaultsSaveFailed: 'Could not save default settings',
    lobbyDefaultsResetTitle: 'Reset lobby defaults?',
    lobbyDefaultsResetMessage:
      'Saved defaults for new rooms will be cleared. Factory settings will appear on this screen.',
    lobbyDefaultsResetConfirm: 'Yes, reset',
    lobbyDefaultsResetFailed: 'Could not reset default settings',
    saved: 'Saved',
    reset: 'Reset',
    goBack: 'Go Back',
    settingsUnsavedTitle: 'Unsaved changes',
    settingsUnsavedMessage: 'Save changes before leaving?',
    settingsUnsavedSave: 'Save',
    settingsUnsavedDiscard: 'Discard',
    settingsUnsavedStay: 'Stay',
    lobbyWordLanguage: 'Word language',
    roundTimeFull: 'Round time',
    imposterDiscussionTime: 'Discussion time',
    scoreToWinFull: 'Score to win',
    skipPenaltyFull: 'Skip penalty',
    skipPenaltyHint: '−1 point per skipped word',
    enabled: 'Enabled',
    disabled: 'Disabled',
    wordCategories: 'Word categories',
    customWords: 'Custom words',
    customWordsPlaceholder: 'Enter words separated by commas...',
    timeMinShort: '{0} min',
    timeSecShort: '{0}s',
    cat_general: 'General',
    cat_food: 'Food',
    cat_travel: 'Travel',
    cat_science: 'Science',
    cat_movies: 'Movies',
    cat_custom: 'Custom',
  }),
}));

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    showNotification,
    roomCode: null,
    currentTheme: {
      bg: '',
      card: '',
      textMain: '',
      button: '',
      iconColor: '',
      isDark: true,
    },
    settings: {
      general: {
        language: 'UA',
        scoreToWin: 30,
        skipPenalty: true,
        categories: ['General'],
        // Device-only prefs that must NOT be synced by LobbySettingsScreen
        theme: 'PREMIUM_DARK',
        soundEnabled: true,
        soundPreset: 'FUN',
      },
      mode: { gameMode: 'CLASSIC', classicRoundTime: 60 },
    },
  }),
}));

describe('LobbySettingsScreen', () => {
  afterEach(() => {
    delete document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG];
    delete document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG];
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authContextValue.authState = {
      status: 'authenticated',
      email: 'player@example.com',
      provider: 'google',
    };
  });

  it('loads saved lobby settings and saves filtered general fields (without theme/sound prefs)', async () => {
    const user = userEvent.setup();
    fetchLobbySettings.mockResolvedValueOnce({
      general: { scoreToWin: 40 },
      mode: { classicRoundTime: 90 },
    });
    saveLobbySettings.mockResolvedValueOnce(undefined);

    renderLobbySettings();

    // Wait for loading spinner to disappear and UI to render
    await waitFor(() => {
      expect(fetchLobbySettings).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Lobby settings')).toBeVisible();
      expect(screen.getByTestId('lobby-defaults-info-banner')).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: 'Save as defaults' }));

    expect(saveLobbySettings).toHaveBeenCalledTimes(1);
    const arg = saveLobbySettings.mock.calls[0]?.[0] as Partial<GameSettings> | undefined;
    expect(arg?.general?.theme).toBeUndefined();
    expect(arg?.general?.soundEnabled).toBeUndefined();
    expect(arg?.general?.soundPreset).toBeUndefined();
    // but still contains real lobby settings
    expect(arg?.general?.scoreToWin).toBe(40);
    expect(
      arg?.mode && 'classicRoundTime' in arg.mode ? arg.mode.classicRoundTime : undefined
    ).toBe(90);
  });

  it('renders language flags, category labels, and accessible skip-penalty switch', async () => {
    fetchLobbySettings.mockResolvedValueOnce({
      general: { scoreToWin: 30, categories: ['General', 'Food'] },
      mode: { classicRoundTime: 60 },
    });

    renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByText('🇺🇦')).toBeVisible();
      expect(screen.getByText('🇩🇪')).toBeVisible();
      expect(screen.getByText('🇬🇧')).toBeVisible();
    });

    expect(screen.getByRole('button', { name: 'General' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Food' })).toBeVisible();
    expect(screen.queryByText('GENERAL')).not.toBeInTheDocument();
    expect(screen.queryByText('FOOD')).not.toBeInTheDocument();

    const skipSwitch = screen.getByRole('switch', { name: 'Skip penalty' });
    expect(skipSwitch).toHaveAttribute('aria-checked', 'true');
  });

  it('shows error notification when saveLobbySettings fails', async () => {
    const user = userEvent.setup();
    fetchLobbySettings.mockResolvedValueOnce({
      general: { scoreToWin: 40 },
      mode: { classicRoundTime: 90 },
    });
    saveLobbySettings.mockRejectedValueOnce(new Error('network'));

    renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save as defaults' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Save as defaults' }));

    expect(saveLobbySettings).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith('Could not save default settings', 'error');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('opens reset confirm and cancels without saving', async () => {
    const user = userEvent.setup();
    fetchLobbySettings.mockResolvedValueOnce({
      general: { scoreToWin: 40 },
      mode: { classicRoundTime: 90 },
    });

    renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(screen.getByText('Reset lobby defaults?')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Go Back' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(saveLobbySettings).not.toHaveBeenCalled();
  });

  it('should prompt before back navigation when settings are dirty', async () => {
    const user = userEvent.setup();
    fetchLobbySettings.mockResolvedValueOnce({
      general: { scoreToWin: 40 },
      mode: { classicRoundTime: 90 },
    });

    renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByText('🇩🇪')).toBeVisible();
    });

    const deChip = screen.getByText('🇩🇪').closest('button');
    if (!deChip) throw new Error('DE language chip missing');
    await user.click(deChip);
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(screen.getByText('Unsaved changes')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Stay' }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(setGameState).not.toHaveBeenCalled();
  });

  it('guest saves to localStorage without calling saveLobbySettings', async () => {
    const user = userEvent.setup();
    authContextValue.authState = { status: 'anonymous', userId: 'guest-1', profile: null };

    renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByTestId('lobby-defaults-guest-banner')).toBeVisible();
      expect(fetchLobbySettings).not.toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: 'Save as defaults' }));

    expect(saveLobbySettings).not.toHaveBeenCalled();
    const raw = localStorage.getItem('alias_guest_lobby_defaults_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { general?: { theme?: string } };
    expect(parsed.general?.theme).toBeUndefined();
  });

  it('guest reset clears localStorage without API', async () => {
    const user = userEvent.setup();
    authContextValue.authState = { status: 'anonymous', userId: 'guest-1', profile: null };
    localStorage.setItem(
      'alias_guest_lobby_defaults_v1',
      JSON.stringify({ general: { scoreToWin: 55 }, mode: { classicRoundTime: 120 } })
    );

    renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByText('55')).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reset' }));

    await waitFor(() => {
      expect(localStorage.getItem('alias_guest_lobby_defaults_v1')).toBeNull();
      expect(saveLobbySettings).not.toHaveBeenCalled();
      expect(screen.getByText('30')).toBeVisible();
    });
  });

  it('should use viewport-fixed liquid glass header and footer island', async () => {
    fetchLobbySettings.mockResolvedValueOnce({
      general: { scoreToWin: 30 },
      mode: { classicRoundTime: 60 },
    });

    const { container } = renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByText('Lobby settings')).toBeVisible();
    });

    const header = document.body.querySelector('header');
    expect(header?.className).toContain(UI_APP_HEADER_FIXED_CLASS);
    expect(document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG]).toBe('true');
    expect(document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG]).toBe('true');

    const scrollColumn = container.querySelector('[data-screen-shell-scroll]');
    expect(scrollColumn?.className).toContain('pt-[var(--app-page-header-height)]');
    expect(scrollColumn?.className).toContain('pb-[var(--footer-island-stack)]');
    expect(header?.closest('[data-screen-shell-scroll]')).toBeNull();

    const footerIsland = document.body.querySelector('footer.footer-island');
    expect(footerIsland).toBeTruthy();
    expect(footerIsland?.closest('[data-screen-shell-scroll]')).toBeNull();
  });

  it('resets to factory defaults after confirm', async () => {
    const user = userEvent.setup();
    fetchLobbySettings
      .mockResolvedValueOnce({
        general: { scoreToWin: 40 },
        mode: { classicRoundTime: 90 },
      })
      .mockResolvedValueOnce(null);
    saveLobbySettings.mockResolvedValueOnce(undefined);

    renderLobbySettings();

    await waitFor(() => {
      expect(screen.getByText('40')).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reset' }));

    await waitFor(() => {
      expect(saveLobbySettings).toHaveBeenCalledWith({});
      expect(fetchLobbySettings).toHaveBeenCalledTimes(2);
      expect(screen.getByText('30')).toBeVisible();
    });
  });
});
