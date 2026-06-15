import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnlineLobbyIntro } from './OnlineLobbyIntro';
import { GameMode } from '../../../types';
import type { GameSettings, ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { Category, Language, AppTheme, SoundPreset } from '@movli/shared';

vi.mock('../../../hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    selectionChanged: vi.fn(),
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

const baseSettings: GameSettings = {
  general: {
    language: Language.UA,
    teamCount: 2,
    teamMode: 'TEAMS',
    categories: [Category.GENERAL],
    scoreToWin: 30,
    skipPenalty: false,
    soundEnabled: true,
    soundPreset: SoundPreset.MINIMAL,
    theme: AppTheme.PAPER_LUXE,
  },
  mode: {
    gameMode: GameMode.CLASSIC,
    classicRoundTime: 60,
  },
};

const t = {
  roomCode: 'ROOM CODE',
  lobbyInvite: 'Invite',
  lobbyInviteFriends: 'Invite friends',
  lobbyInviteTelegram: 'Telegram',
  lobbyInviteCopyLink: 'Link',
  lobbyInviteQr: 'QR code',
  lobbyQrRetry: 'Try again',
  lobbyQrLoading: 'Generating QR code',
  pts: 'pts',
  gameMode: 'Mode',
  roundTime: 'Round',
  scoreToWin: 'Goal',
  categories: 'Words',
  lobbyRulesSummaryTitle: 'Game rules',
  lobbyRulesSummaryHintHost: 'Tap to change mode, time and words',
  lobbyRulesSummaryHintGuest: 'Selected game rules',
  lobbyRulesSummaryEdit: 'Edit rules',
  customDeckChip: 'Custom: {0}',
} as TranslationStrings;

const defaultProps = {
  theme,
  t,
  roomCode: 'ABCDE',
  settings: baseSettings,
  modeLabel: 'Classic',
  categoriesPreview: 'General',
  qrCodeData: 'data:image/png;base64,x',
  qrStatus: 'ready' as const,
  onRetryQr: vi.fn(),
  isHost: true,
  onShareLink: vi.fn(),
  onInviteTelegram: vi.fn(),
  onShowQr: vi.fn(),
  onOpenSettings: vi.fn(),
};

describe('OnlineLobbyIntro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render labeled rules summary for guest', () => {
    render(<OnlineLobbyIntro {...defaultProps} isHost={false} />);

    expect(screen.getByTestId('lobby-settings-chips').tagName).toBe('DIV');
    expect(screen.getByText('Game rules')).toBeTruthy();
    expect(screen.queryByText('Host chose these rules')).toBeNull();
    expect(screen.queryByText('Tap to change mode, time and words')).toBeNull();
    expect(screen.getByText('Classic')).toBeTruthy();
    expect(screen.getByText('60s')).toBeTruthy();
    expect(screen.getByText('30 pts')).toBeTruthy();
    expect(screen.getByText('General')).toBeTruthy();
  });

  it('should call onOpenSettings when host taps rules card', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(<OnlineLobbyIntro {...defaultProps} onOpenSettings={onOpenSettings} />);

    await user.click(screen.getByTestId('lobby-settings-chips'));
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('should show rules title for host without description copy', () => {
    render(<OnlineLobbyIntro {...defaultProps} />);

    expect(screen.getByText('Game rules')).toBeTruthy();
    expect(screen.queryByText('Tap to change mode, time and words')).toBeNull();
    expect(screen.queryByText('Edit rules')).toBeNull();
  });

  it('should preserve lobby-room-code test id without invite button inside', () => {
    render(<OnlineLobbyIntro {...defaultProps} roomCode="XYZZY" />);

    const codeBlock = screen.getByTestId('lobby-room-code');
    expect(codeBlock).toHaveTextContent('XYZZY');
    expect(codeBlock.querySelector('button')).toBeNull();
  });

  it('should place invite button beside room code in a 70/30 row', () => {
    render(<OnlineLobbyIntro {...defaultProps} />);

    const codeBlock = screen.getByTestId('lobby-room-code');
    const inviteBtn = screen.getByTestId('lobby-invite-button');
    expect(codeBlock.parentElement).toBe(inviteBtn.parentElement);
    expect(
      codeBlock.compareDocumentPosition(inviteBtn) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(codeBlock.className).toContain('flex-[7]');
    expect(inviteBtn.className).toContain('flex-[3]');
    expect(screen.getByText('Invite friends')).toBeTruthy();
  });

  it('should open invite sheet when invite icon is tapped', async () => {
    const user = userEvent.setup();

    render(<OnlineLobbyIntro {...defaultProps} />);

    await user.click(screen.getByTestId('lobby-invite-button'));

    await waitFor(() => {
      expect(screen.getByTestId('lobby-invite-sheet')).toBeTruthy();
    });
    expect(screen.getByText('Telegram')).toBeTruthy();
    expect(screen.getByText('Link')).toBeTruthy();
    expect(screen.getByText('QR code')).toBeTruthy();
  });
});
