import React from 'react';
import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackNavigationGuardProvider } from '../../context/BackNavigationGuardContext';
import {
  APP_HEADER_DOCUMENT_FLAG,
  UI_APP_HEADER_FIXED_CLASS,
} from '../../components/layout/GlassAppHeader';
import { FOOTER_ISLAND_DOCUMENT_FLAG } from '../../components/layout/FooterIsland';
import { ProfileSettingsScreen } from './ProfileSettingsScreen';

function renderProfileSettings() {
  return render(
    <BackNavigationGuardProvider>
      <ProfileSettingsScreen />
    </BackNavigationGuardProvider>
  );
}

const setGameState = vi.fn();
const showNotification = vi.fn();
const refreshProfile = vi.fn();

const updateProfile = vi.fn();

const authContextValue: {
  authState: { status: 'authenticated'; email: string; provider: string };
  profile: {
    displayName: string;
    email: string;
    avatarId: string | null;
    skipNamePrompt: boolean;
  };
  refreshProfile: typeof refreshProfile;
} = {
  authState: { status: 'authenticated', email: 'player@example.com', provider: '' },
  profile: {
    displayName: 'Player',
    email: 'player@example.com',
    avatarId: '0',
    skipNamePrompt: false,
  },
  refreshProfile,
};

vi.mock('../../services/api', () => ({
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}));

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    showNotification,
    currentTheme: {
      bg: '',
      card: '',
      textMain: '',
      button: '',
      iconColor: '',
      isDark: true,
    },
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => authContextValue,
}));

vi.mock('../../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    permission: 'default',
    supported: false,
    loading: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

vi.mock('../../hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ canInstall: false, install: vi.fn() }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    profileNavProfileSettings: 'Profile settings',
    profileSettingsChooseAvatar: 'Choose avatar',
    profileSettingsGameName: 'In-game name',
    profileSettingsNamePlaceholder: 'Your name…',
    profileSettingsAccount: 'Account',
    profileSettingsProvider: 'Provider',
    save: 'Save',
    saved: 'Saved',
    profileSettingsSaveFailed: 'Could not save profile',
    settingsUnsavedTitle: 'Unsaved changes',
    settingsUnsavedMessage: 'Save changes before leaving?',
    settingsUnsavedSave: 'Save',
    settingsUnsavedDiscard: 'Discard',
    settingsUnsavedStay: 'Stay',
  }),
}));

describe('ProfileSettingsScreen', () => {
  afterEach(() => {
    delete document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG];
    delete document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG];
  });

  beforeEach(() => {
    vi.clearAllMocks();
    refreshProfile.mockResolvedValue(undefined);
    authContextValue.authState = {
      status: 'authenticated',
      email: 'player@example.com',
      provider: '',
    };
    authContextValue.profile = {
      displayName: 'Player',
      email: 'player@example.com',
      avatarId: '0',
      skipNamePrompt: false,
    };
  });

  it('shows error notification when profile save fails', async () => {
    const user = userEvent.setup();
    updateProfile.mockRejectedValueOnce(new Error('network'));

    renderProfileSettings();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(refreshProfile).not.toHaveBeenCalled();
    expect(showNotification).toHaveBeenCalledWith('Could not save profile', 'error');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('should prompt before back when profile form is dirty', async () => {
    const user = userEvent.setup();

    renderProfileSettings();

    const nameInput = screen.getByPlaceholderText('Your name…');
    fireEvent.change(nameInput, { target: { value: 'NewName' } });

    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('alertdialog')).toBeVisible();
    expect(screen.getByText('Unsaved changes')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => {
      expect(setGameState).toHaveBeenCalled();
    });
  });

  it('shows saved state when profile save succeeds', async () => {
    const user = userEvent.setup();
    updateProfile.mockResolvedValueOnce(undefined);

    renderProfileSettings();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(refreshProfile).toHaveBeenCalledTimes(1);
    expect(showNotification).not.toHaveBeenCalled();
    expect(await screen.findByText('Saved')).toBeVisible();
  });

  it('should reflect trimmed local name in avatar preview', () => {
    authContextValue.profile = {
      displayName: 'Player',
      email: 'player@example.com',
      avatarId: null,
      skipNamePrompt: false,
    };

    renderProfileSettings();

    const nameInput = screen.getByPlaceholderText('Your name…');
    fireEvent.change(nameInput, { target: { value: '  Nova  ' } });

    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('should truncate long email on narrow layouts', () => {
    renderProfileSettings();

    const emailEl = screen.getByText('player@example.com');
    expect(emailEl).toHaveClass('truncate');
    expect(emailEl).toHaveClass('min-w-0');
  });

  it('should use 5-column avatar grid for 44px tap targets', () => {
    renderProfileSettings();

    const section = screen.getByText('Choose avatar').parentElement;
    expect(section?.querySelector('.grid-cols-5')).not.toBeNull();
  });

  it('should use viewport-fixed liquid glass header and footer island', () => {
    const { container } = renderProfileSettings();

    const header = document.body.querySelector('header');
    expect(header?.className).toContain(UI_APP_HEADER_FIXED_CLASS);
    expect(document.documentElement.dataset[APP_HEADER_DOCUMENT_FLAG]).toBe('true');
    expect(document.documentElement.dataset[FOOTER_ISLAND_DOCUMENT_FLAG]).toBe('true');

    const scrollColumn = container.querySelector('[data-screen-shell-scroll]');
    expect(scrollColumn?.className).toContain('pt-[var(--app-page-header-height)]');
    expect(scrollColumn?.querySelector('[data-screen-shell-footer-spacer]')).toBeTruthy();
    expect(header?.closest('[data-screen-shell-scroll]')).toBeNull();

    const footerIsland = document.body.querySelector('footer.footer-island');
    expect(footerIsland).toBeTruthy();
    expect(footerIsland?.closest('[data-screen-shell-scroll]')).toBeNull();
  });
});
