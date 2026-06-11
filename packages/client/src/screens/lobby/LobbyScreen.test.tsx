import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  APP_HEADER_DOCUMENT_FLAG,
  UI_APP_HEADER_FIXED_CLASS,
} from '../../components/layout/GlassAppHeader';
import { FOOTER_ISLAND_DOCUMENT_FLAG } from '../../components/layout/FooterIsland';
import { LobbyExitProvider } from '../../context/LobbyExitContext';
import { LobbyScreen } from './LobbyScreen';
import { GameMode } from '../../types';

const sendAction = vi.fn();
const setGameState = vi.fn();
const leaveRoom = vi.fn();
const showNotification = vi.fn();
const addOfflinePlayer = vi.fn();
const removeOfflinePlayer = vi.fn();
const setTeams = vi.fn();

const theme = {
  bg: 'bg-test',
  card: '',
  textMain: 'text-main',
  textSecondary: 'text-secondary',
  button: 'btn',
  iconColor: 'icon',
  isDark: true,
};

const baseSettings = {
  general: {
    language: 'UA',
    teamCount: 2,
    teamMode: 'TEAMS' as const,
    categories: ['GENERAL'],
    scoreToWin: 30,
    skipPenalty: false,
  },
  mode: {
    gameMode: GameMode.CLASSIC,
    classicRoundTime: 60,
  },
};

const players = [
  {
    id: 'h1',
    name: 'Host',
    avatar: '🦊',
    isHost: true,
    isConnected: true,
    stats: { explained: 0, guessed: 0 },
  },
  {
    id: 'p2',
    name: 'Guest',
    avatar: '🐺',
    isHost: false,
    isConnected: true,
    stats: { explained: 0, guessed: 0 },
  },
];

let mockGameMode: 'ONLINE' | 'OFFLINE' = 'ONLINE';
let mockIsHost = true;
let mockTeams = [
  {
    id: 'team-0',
    name: 'Team 1',
    score: 0,
    color: 'TEAM_1',
    colorHex: '#000',
    players: [players[0]],
    nextPlayerIndex: 0,
  },
  {
    id: 'team-1',
    name: 'Team 2',
    score: 0,
    color: 'TEAM_2',
    colorHex: '#111',
    players: [] as typeof players,
    nextPlayerIndex: 0,
  },
];

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    currentTheme: theme,
    roomCode: 'ABCDE',
    players,
    settings: baseSettings,
    sendAction,
    isHost: mockIsHost,
    gameMode: mockGameMode,
    myPlayerId: mockIsHost ? 'h1' : 'p2',
    teams: mockTeams,
    teamsLocked: false,
    connectionError: null,
    connectionErrorCode: null,
    isConnected: true,
    isReconnecting: false,
    addOfflinePlayer,
    removeOfflinePlayer,
    leaveRoom,
    showNotification,
    setTeams,
  }),
}));

const mockT = {
  lobby: 'Lobby',
  confirmExit: 'Exit',
  settings: 'Settings',
  leaveLobbyConfirm: 'Leave?',
  leaveLobbyMsg: 'Sure?',
  goBack: 'Back',
  kickConfirmTitle: 'Kick?',
  kickConfirmMsg: 'Kick {0}?',
  kickConfirmYes: 'Yes',
  scanToJoin: 'Scan',
  shuffle: 'Shuffle',
  shuffleAll: 'Shuffle all',
  shuffleAllConfirmTitle: 'Shuffle all?',
  shuffleAllConfirmMsg: 'Redistribute',
  shuffleAllConfirmYes: 'Yes shuffle',
  teams: 'Teams',
  lockTeams: 'Lock',
  unlockTeams: 'Unlock',
  startGame: 'Start',
  waitHost: 'Waiting',
  lobbyStartMinPlayers: 'Need 2 players',
  lobbyStartUnassigned: 'Assign all',
  lobbyStartEmptyTeam: 'Empty team',
  lobbyReadinessReady: 'Ready to start',
  lobbyReadinessMinPlayers: '≥2 players',
  lobbyReadinessAllAssigned: 'All in teams',
  lobbyReadinessEachTeam: 'Each team has a player',
  lobbyGuestWaitingTitle: 'Host is setting up',
  lobbyGuestInTeam: "You're on a team",
  lobbyGuestPickTeam: 'Pick a team',
  lobbyGuestWaitingFooter: 'Waiting for start',
  lobbyGuestPlayerCount: '{0} players in room',
  lobbyShowTeams: 'Show teams',
  lobbyHideTeams: 'Hide teams',
  lobbyConfigureTeams: 'Configure teams',
  playerLimitReached: 'Limit {0}',
  playerLimitMaxTitle: 'Max',
  playerLimitMaxHint: 'Max {0}',
  addPlayerTitle: 'Add',
  namePlaceholder: 'Name',
  add: 'Add',
  close: 'Close',
  roomCode: 'Code',
  inviteFriends: 'Invite',
  pts: 'pts',
  tapToEdit: 'Edit',
  lobbyInvite: 'Invite',
  lobbyInviteCopyCode: 'Copy code',
  lobbyInviteCopyLink: 'Copy',
  lobbyInviteTelegram: 'TG',
  lobbyInviteQr: 'QR',
  copyRoomCodeTitle: 'Copy code',
  roomCodeCopied: 'Code copied',
  linkCopied: 'Copied',
  copyFailed: 'Failed',
  lobbyInviteTelegramText: 'Join!',
  unassignedPool: 'Unassigned ({0})',
  assignPlayerAria: 'Assign {0}',
  allPlayersAssigned: 'All assigned',
  teamTooMany: 'Too many',
  teamJoin: 'Join',
  teamLeave: 'Leave',
  noPlayersInTeam: 'No players',
  players: 'Players',
  addPlayer: 'Add player',
  kickPlayerTitle: 'Kick',
  more: 'More',
  playerOnlineHint: 'Online',
  playerDisconnected: 'Offline',
  removePlayer: 'Remove',
  renameTeam: 'Rename team',
  tgAppLinkNotConfigured: 'TG link not configured',
  gameModeClassic: 'Classic',
};

vi.mock('../../hooks/useT', () => ({
  useT: () => mockT,
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qr'),
  },
}));

vi.mock('../../hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    impactOccurred: vi.fn(),
    notificationOccurred: vi.fn(),
    pattern: vi.fn(),
    selectionChanged: vi.fn(),
  }),
}));

const isTelegramMiniApp = vi.fn(() => false);

const hasTelegramInitData = vi.fn(() => false);

vi.mock('../../hooks/useTelegramApp', () => ({
  isTelegramMiniApp: () => isTelegramMiniApp(),
  hasTelegramInitData: () => hasTelegramInitData(),
}));

function renderLobbyScreen() {
  return render(
    <LobbyExitProvider>
      <LobbyScreen />
    </LobbyExitProvider>
  );
}

describe('LobbyScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTelegramMiniApp.mockReturnValue(false);
    hasTelegramInitData.mockReturnValue(false);
    mockGameMode = 'ONLINE';
    mockIsHost = true;
    mockTeams = [
      {
        id: 'team-0',
        name: 'Team 1',
        score: 0,
        color: 'TEAM_1',
        colorHex: '#000',
        players: [players[0]],
        nextPlayerIndex: 0,
      },
      {
        id: 'team-1',
        name: 'Team 2',
        score: 0,
        color: 'TEAM_2',
        colorHex: '#111',
        players: [],
        nextPlayerIndex: 0,
      },
    ];
  });

  it('should open leave confirmation when browser back is tapped and leave room on confirm', async () => {
    const user = userEvent.setup();
    renderLobbyScreen();

    await user.click(screen.getByTestId('app-header-back'));
    const dialog = await waitFor(() => screen.getByRole('alertdialog'));
    expect(within(dialog).getByRole('heading', { name: 'Leave?' })).toBeTruthy();
    expect(within(dialog).getByText('Sure?')).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: 'Exit' }));
    expect(leaveRoom).toHaveBeenCalledWith(undefined);
  });

  it('should leave offline lobby without resetting gameMode after confirm', async () => {
    const user = userEvent.setup();
    mockGameMode = 'OFFLINE';
    renderLobbyScreen();

    await user.click(screen.getByTestId('app-header-back'));
    const dialog = await waitFor(() => screen.getByRole('alertdialog'));
    await user.click(within(dialog).getByRole('button', { name: 'Exit' }));
    expect(leaveRoom).toHaveBeenCalledWith({ resetGameMode: false });
  });

  it('should show avatar strip instead of full players list in ONLINE mode', () => {
    renderLobbyScreen();
    expect(screen.getByTestId('lobby-avatar-strip')).toBeTruthy();
    expect(screen.queryByTestId('lobby-players-section')).toBeNull();
  });

  it('should show full players section in OFFLINE mode', () => {
    mockGameMode = 'OFFLINE';
    renderLobbyScreen();
    expect(screen.getByTestId('lobby-players-section')).toBeTruthy();
    expect(screen.queryByTestId('lobby-avatar-strip')).toBeNull();
  });

  it('should hide start validation line above button when teams incomplete', () => {
    renderLobbyScreen();
    expect(screen.queryByTestId('lobby-start-validation')).toBeNull();
    expect(screen.queryByTestId('lobby-readiness-bar')).toBeNull();
  });

  it('should mark start as unavailable but still tappable for hint toast', () => {
    renderLobbyScreen();
    const startBtn = screen.getByTestId('lobby-start-btn');
    expect(startBtn).toHaveAttribute('aria-disabled', 'true');
    expect(startBtn).not.toBeDisabled();
    expect(startBtn).toHaveClass('lobby-start-btn--blocked');
  });

  it('should show guest waiting card for online guests', () => {
    mockIsHost = false;
    renderLobbyScreen();
    expect(screen.getByTestId('lobby-guest-waiting')).toBeTruthy();
    expect(screen.getByText('Pick a team')).toBeTruthy();
    expect(screen.getByText('Waiting for start')).toBeTruthy();
  });

  it('should show unassigned pool when a player has no team', () => {
    renderLobbyScreen();
    expect(screen.getByText('Unassigned (1)')).toBeTruthy();
  });

  it('should show play mode bar for online guest without a team', () => {
    mockIsHost = false;
    renderLobbyScreen();
    expect(screen.getByTestId('lobby-play-mode-bar')).toBeTruthy();
  });

  it('should hide play mode bar for online guest already on a team', async () => {
    mockIsHost = false;
    mockTeams = [
      {
        id: 'team-0',
        name: 'Team 1',
        score: 0,
        color: 'TEAM_1',
        colorHex: '#000',
        players: [players[0]],
        nextPlayerIndex: 0,
      },
      {
        id: 'team-1',
        name: 'Team 2',
        score: 0,
        color: 'TEAM_2',
        colorHex: '#111',
        players: [players[1]],
        nextPlayerIndex: 0,
      },
    ];
    renderLobbyScreen();
    expect(screen.queryByTestId('lobby-play-mode-bar-slot')).toBeNull();
  });

  it('should show browser back and settings in header for online host outside TMA', () => {
    renderLobbyScreen();
    expect(screen.getByTestId('app-header-back')).toBeTruthy();
    expect(screen.getByTestId('lobby-header-settings')).toBeTruthy();
  });

  it('should hide header settings in TMA online mode', () => {
    isTelegramMiniApp.mockReturnValue(true);
    hasTelegramInitData.mockReturnValue(true);
    renderLobbyScreen();
    expect(screen.queryByTestId('lobby-header-settings')).toBeNull();
    expect(screen.queryByTestId('app-header-back')).toBeNull();
  });

  it('should open invite sheet when invite button is tapped', async () => {
    const user = userEvent.setup();
    renderLobbyScreen();

    await user.click(screen.getByTestId('lobby-invite-button'));

    await waitFor(() => {
      expect(screen.getByTestId('lobby-invite-sheet')).toBeTruthy();
    });
    expect(screen.getByText('TG')).toBeTruthy();
    expect(screen.getByText('Copy')).toBeTruthy();
    expect(screen.getByText('QR')).toBeTruthy();
  });

  it('should use viewport-fixed liquid glass header and footer island', () => {
    const { container } = renderLobbyScreen();

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
});
