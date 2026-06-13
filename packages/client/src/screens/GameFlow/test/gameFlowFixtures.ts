import { vi } from 'vitest';
import { GameMode, GameState } from '../../../types';
import type { Player, Team } from '../../../types';

export const gameFlowTheme = {
  bg: 'bg-test',
  card: '',
  textMain: 'text-main',
  textSecondary: 'text-secondary',
  textAccent: 'text-accent',
  button: 'btn',
  iconColor: 'icon',
  progressBar: 'progress',
  isDark: true,
};

export const gameFlowPlayers: Player[] = [
  {
    id: 'h1',
    name: 'Alice',
    avatar: '🦊',
    isHost: true,
    isConnected: true,
    stats: { explained: 0, guessed: 0 },
  },
  {
    id: 'p2',
    name: 'Bob',
    avatar: '🐺',
    isHost: false,
    isConnected: true,
    stats: { explained: 0, guessed: 0 },
  },
];

export function makeTeams(overrides?: Partial<Team>[]): Team[] {
  const defaults: Team[] = [
    {
      id: 'team-0',
      name: 'Red Team',
      score: 12,
      color: 'TEAM_1',
      colorHex: '#c00',
      players: [gameFlowPlayers[0]!, gameFlowPlayers[1]!],
      nextPlayerIndex: 0,
    },
    {
      id: 'team-1',
      name: 'Blue Team',
      score: 8,
      color: 'TEAM_2',
      colorHex: '#06c',
      players: [],
      nextPlayerIndex: 0,
    },
  ];
  if (!overrides) return defaults;
  return defaults.map((team, idx) => ({ ...team, ...overrides[idx] }));
}

export const gameFlowSettings = {
  general: {
    language: 'EN' as const,
    teamCount: 2,
    teamMode: 'TEAMS' as const,
    categories: ['GENERAL'],
    scoreToWin: 30,
    skipPenalty: true,
    soundEnabled: false,
    theme: 'CLASSIC' as const,
  },
  mode: {
    gameMode: GameMode.CLASSIC,
    classicRoundTime: 60,
  },
};

export const gameFlowMockT = {
  takePhone: "I'M READY",
  waitAdmin: 'Waiting for admin...',
  explains: 'Explaining',
  playingNow: 'Playing',
  noPlayersInTeam: 'No players',
  backToLobby: 'Back to lobby',
  toMainMenu: 'Main menu',
  leaveLobbyConfirm: 'Leave?',
  leaveLobbyMsg: 'Sure?',
  confirmExit: 'Exit',
  goBack: 'Back',
  passPhoneTo: 'Pass phone to {0}',
  correct: 'Correct',
  skip: 'Skip',
  score: 'Score',
  youGuess: 'You guess',
  guessed: 'Guessed',
  guesserListenHint: 'Listen',
  skippedWord: 'Skipped',
  finishWord: 'Finish word',
  paused: 'Paused',
  tapResume: 'Tap to resume',
  timeIsUp: "Time's up",
  continue: 'Continue',
  roundPoints: 'Round points',
  playedTeam: 'Team {0}',
  playedBy: 'Played by {0}',
  nextUp: 'Next: {0}',
  milestone: 'Milestone',
  teamReached: 'Team reached',
  nextRound: 'Round',
  goal: 'Goal',
  pts: 'pts',
  points: 'points',
  quizRoundClock: 'Round clock',
  imposterTapToFlip: 'Tap to reveal',
};

export const gameFlowActionMocks = {
  handleStartRound: vi.fn(),
  setGameState: vi.fn(),
  leaveRoom: vi.fn(),
  startGameplay: vi.fn(),
  playSound: vi.fn(),
  handleCorrect: vi.fn(),
  handleSkip: vi.fn(),
  sendAction: vi.fn(),
  togglePause: vi.fn(),
  setTimeLeft: vi.fn(),
  handleNextRound: vi.fn(),
};

export type GameFlowMockRefs = {
  myPlayerId: string;
  gameMode: 'ONLINE' | 'OFFLINE';
  isHost: boolean;
  teams: Team[];
  currentTeamIndex: number;
  currentWord: string;
  timeLeft: number;
  imposterPhase: 'REVEAL' | 'DISCUSSION' | 'RESULTS' | undefined;
  imposterSecret: { isImposter: boolean; word: string | null } | null;
  imposterWord: string | null;
};

export const gameFlowMockRefs: GameFlowMockRefs = {
  myPlayerId: 'h1',
  gameMode: 'ONLINE',
  isHost: true,
  teams: makeTeams(),
  currentTeamIndex: 0,
  currentWord: 'umbrella',
  timeLeft: 45,
  imposterPhase: 'DISCUSSION',
  imposterSecret: { isImposter: false, word: 'SUPERSECRET_WORD' },
  imposterWord: 'SUPERSECRET_WORD',
};

export function resetGameFlowMocks(): void {
  gameFlowMockRefs.myPlayerId = 'h1';
  gameFlowMockRefs.gameMode = 'ONLINE';
  gameFlowMockRefs.isHost = true;
  gameFlowMockRefs.teams = makeTeams();
  gameFlowMockRefs.currentTeamIndex = 0;
  gameFlowMockRefs.currentWord = 'umbrella';
  gameFlowMockRefs.timeLeft = 45;
  gameFlowMockRefs.imposterPhase = 'DISCUSSION';
  gameFlowMockRefs.imposterSecret = { isImposter: false, word: 'SUPERSECRET_WORD' };
  gameFlowMockRefs.imposterWord = 'SUPERSECRET_WORD';
  Object.values(gameFlowActionMocks).forEach((fn) => fn.mockClear());
}

export function buildMockGame(overrides: Record<string, unknown> = {}) {
  const activeTeam = gameFlowMockRefs.teams[gameFlowMockRefs.currentTeamIndex];
  const explainer =
    activeTeam?.players[
      Math.min(activeTeam.nextPlayerIndex, Math.max(0, activeTeam.players.length - 1))
    ] ?? activeTeam?.players[0];

  return {
    currentTheme: gameFlowTheme,
    teams: gameFlowMockRefs.teams,
    currentTeamIndex: gameFlowMockRefs.currentTeamIndex,
    myPlayerId: gameFlowMockRefs.myPlayerId,
    gameMode: gameFlowMockRefs.gameMode,
    isHost: gameFlowMockRefs.isHost,
    players: gameFlowPlayers,
    settings: gameFlowSettings,
    gameState: GameState.PLAYING,
    currentWord: gameFlowMockRefs.currentWord,
    currentTask: null,
    currentTaskAnswered: undefined,
    timeLeft: gameFlowMockRefs.timeLeft,
    setTimeLeft: gameFlowActionMocks.setTimeLeft,
    roundEndsAt: null,
    quizTaskLockUntil: null,
    quizRoundTimeLeft: null,
    isPaused: false,
    timeUp: false,
    currentRoundStats: {
      correct: 3,
      skipped: 1,
      words: [],
      teamId: activeTeam?.id ?? 'team-0',
      explainerName: explainer?.name ?? 'Alice',
      explainerId: explainer?.id ?? 'h1',
    },
    imposterPhase: gameFlowMockRefs.imposterPhase,
    imposterPlayerId: 'p2',
    revealedPlayerIds: [] as string[],
    imposterSecret: gameFlowMockRefs.imposterSecret,
    imposterOfflineRevealIndex: 0,
    imposterWord: gameFlowMockRefs.imposterWord,
    handleStartRound: gameFlowActionMocks.handleStartRound,
    setGameState: gameFlowActionMocks.setGameState,
    leaveRoom: gameFlowActionMocks.leaveRoom,
    startGameplay: gameFlowActionMocks.startGameplay,
    playSound: gameFlowActionMocks.playSound,
    handleCorrect: gameFlowActionMocks.handleCorrect,
    handleSkip: gameFlowActionMocks.handleSkip,
    sendAction: gameFlowActionMocks.sendAction,
    togglePause: gameFlowActionMocks.togglePause,
    handleNextRound: gameFlowActionMocks.handleNextRound,
    ...overrides,
  };
}
