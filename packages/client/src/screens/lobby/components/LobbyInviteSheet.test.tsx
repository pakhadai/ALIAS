import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbyInviteSheet } from './LobbyInviteSheet';
import type { ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';

vi.mock('../../../hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    selectionChanged: vi.fn(),
    pattern: vi.fn(),
  }),
}));

const theme = {
  bg: 'bg-test',
  card: '',
  textMain: 'text-main',
  textSecondary: 'text-secondary',
  button: 'btn',
  iconColor: 'icon',
  isDark: true,
} as ThemeConfig;

const t = {
  lobbyInvite: 'Invite',
  lobbyInviteTelegram: 'Telegram',
  lobbyInviteCopyLink: 'Link',
  lobbyInviteQr: 'QR code',
  lobbyQrRetry: 'Try again',
  lobbyQrLoading: 'Generating QR code',
} as TranslationStrings;

const defaultProps = {
  onDismiss: vi.fn(),
  theme,
  t,
  qrCodeData: 'data:image/png;base64,x',
  qrStatus: 'ready' as const,
  onShareLink: vi.fn(),
  onInviteTelegram: vi.fn(),
  onShowQr: vi.fn(),
  onRetryQr: vi.fn(),
};

describe('LobbyInviteSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open QR modal when QR is ready', async () => {
    const user = userEvent.setup();
    const onShowQr = vi.fn();

    render(<LobbyInviteSheet {...defaultProps} onShowQr={onShowQr} />);

    await user.click(screen.getByTestId('lobby-invite-qr-button'));

    expect(onShowQr).toHaveBeenCalledOnce();
    expect(defaultProps.onRetryQr).not.toHaveBeenCalled();
  });

  it('should disable QR button while loading', () => {
    render(<LobbyInviteSheet {...defaultProps} qrStatus="loading" qrCodeData="" />);

    expect(screen.getByTestId('lobby-invite-qr-button')).toBeDisabled();
    expect(screen.getByTestId('lobby-invite-qr-button')).toHaveAttribute('aria-busy', 'true');
  });

  it('should retry QR generation when status is error', async () => {
    const user = userEvent.setup();
    const onRetryQr = vi.fn();

    render(
      <LobbyInviteSheet {...defaultProps} qrStatus="error" qrCodeData="" onRetryQr={onRetryQr} />
    );

    expect(screen.getByTestId('lobby-invite-qr-button')).toHaveTextContent('Try again');

    await user.click(screen.getByTestId('lobby-invite-qr-button'));

    expect(onRetryQr).toHaveBeenCalledOnce();
    expect(defaultProps.onShowQr).not.toHaveBeenCalled();
  });
});
