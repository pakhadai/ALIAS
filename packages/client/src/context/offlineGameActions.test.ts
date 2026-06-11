import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyOfflineGameAction, type OfflineGameActionDeps } from './offlineGameActions';
import { gameReducer, initialState } from './gameReducer';
import type { Action } from './gameReducer';
import type { AppState, Player } from '../types';
import { GameState, GameMode } from '../types';
import { MAX_PLAYERS } from '../constants';

const quizModeSettings: AppState['settings']['mode'] = {
  gameMode: GameMode.QUIZ,
  classicRoundTime: 60,
  quizRoundTime: 90,
  quizQuestionTime: 12,
  quizTimerMode: 'ROUND',
  quizTypes: { synonyms: true, antonyms: true, taboo: true, translation: true },
  quizWrongPenaltyEnabled: false,
};

function makePlayer(id: string, name: string): Player {
  return {
    id,
    name,
    avatar: '🦊',
    isHost: id === 'host',
    stats: { explained: 0, guessed: 0 },
  };
}

function createOfflineDeps(overrides: Partial<AppState> = {}): {
  deps: OfflineGameActionDeps;
  getState: () => AppState;
} {
  let current = gameReducer(initialState, {
    type: 'SET_STATE',
    payload: {
      gameMode: 'OFFLINE',
      isHost: true,
      myPlayerId: 'host',
      players: [makePlayer('host', 'Host'), makePlayer('guest', 'Guest')],
      currentWord: 'apple',
      currentRoundStats: {
        correct: 0,
        skipped: 0,
        words: [],
        teamId: 'team-0',
        explainerName: 'Host',
        explainerId: 'host',
      },
      ...overrides,
    },
  });

  const stateRef = { current };
  const dispatch = (action: Action) => {
    current = gameReducer(current, action);
    stateRef.current = current;
  };

  const deps: OfflineGameActionDeps = {
    stateRef,
    dispatch,
    playSound: vi.fn(),
    nextWordLogic: vi.fn(),
    nextOfflineImposterWord: vi.fn(() => 'secret-word'),
    offlineQuizLockTaskIdRef: { current: null },
  };

  return { deps, getState: () => current };
}

describe('applyOfflineGameAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should ignore host-only actions when caller is not host', () => {
    const { deps, getState } = createOfflineDeps({ isHost: false, myPlayerId: 'guest' });
    applyOfflineGameAction(deps, { action: 'START_GAME' });
    expect(getState().gameState).toBe(GameState.MENU);
  });

  it('should allow PAUSE_GAME from non-host in offline mode', () => {
    const { deps, getState } = createOfflineDeps({
      isHost: false,
      myPlayerId: 'guest',
      gameState: GameState.PLAYING,
      isPaused: false,
    });
    applyOfflineGameAction(deps, { action: 'PAUSE_GAME' });
    expect(getState().isPaused).toBe(true);
  });

  it('should transition to PRE_ROUND on START_GAME and lock teams', () => {
    const { deps, getState } = createOfflineDeps();
    applyOfflineGameAction(deps, { action: 'START_GAME' });
    expect(getState().gameState).toBe(GameState.PRE_ROUND);
    expect(getState().teamsLocked).toBe(true);
    expect(getState().currentTeamIndex).toBe(0);
    expect(getState().teams).toHaveLength(2);
    expect(getState().teams[0]?.players).toHaveLength(1);
    expect(getState().teams[1]?.players).toHaveLength(1);
  });

  it('should build solo teams from players on START_GAME in SOLO mode', () => {
    const { deps, getState } = createOfflineDeps({
      gameState: GameState.LOBBY,
      settings: {
        ...initialState.settings,
        general: { ...initialState.settings.general, teamMode: 'SOLO' },
      },
    });
    applyOfflineGameAction(deps, { action: 'START_GAME' });
    const { teams, players } = getState();
    expect(teams).toHaveLength(players.length);
    expect(teams.every((team) => team.players.length === 1)).toBe(true);
    expect(teams.map((team) => team.players[0]?.id)).toEqual(players.map((p) => p.id));
  });

  it('should persist assigned TEAMS shells on START_GAME in TEAMS mode', () => {
    const host = makePlayer('host', 'Host');
    const guest = makePlayer('guest', 'Guest');
    const { deps, getState } = createOfflineDeps({
      gameState: GameState.LOBBY,
      players: [host, guest],
      settings: {
        ...initialState.settings,
        general: { ...initialState.settings.general, teamMode: 'TEAMS', teamCount: 2 },
      },
      teams: [
        {
          id: 'team-0',
          name: 'A',
          score: 0,
          color: 'c1',
          colorHex: '#111',
          players: [host],
          nextPlayerIndex: 0,
        },
        {
          id: 'team-1',
          name: 'B',
          score: 0,
          color: 'c2',
          colorHex: '#222',
          players: [guest],
          nextPlayerIndex: 0,
        },
      ],
    });
    applyOfflineGameAction(deps, { action: 'START_GAME' });
    expect(getState().gameState).toBe(GameState.PRE_ROUND);
    expect(getState().teams).toHaveLength(2);
    expect(getState().teams[0]?.players.map((p) => p.id)).toEqual(['host']);
    expect(getState().teams[1]?.players.map((p) => p.id)).toEqual(['guest']);
  });

  it('should reject START_GAME when lobby readiness fails (fewer than 2 players)', () => {
    const { deps, getState } = createOfflineDeps({
      gameState: GameState.LOBBY,
      players: [makePlayer('host', 'Host')],
    });
    applyOfflineGameAction(deps, { action: 'START_GAME' });
    expect(getState().gameState).toBe(GameState.LOBBY);
    expect(getState().teamsLocked).toBe(false);
  });

  it('should build solo teams on START_GAME in QUIZ mode', () => {
    const { deps, getState } = createOfflineDeps({
      gameState: GameState.LOBBY,
      settings: {
        ...initialState.settings,
        general: { ...initialState.settings.general, teamMode: 'SOLO' },
        mode: quizModeSettings,
      },
    });
    applyOfflineGameAction(deps, { action: 'START_GAME' });
    expect(getState().gameState).toBe(GameState.COUNTDOWN);
    expect(getState().teams).toHaveLength(2);
    expect(getState().teams.every((team) => team.players.length === 1)).toBe(true);
  });

  it('should increment correct count and call nextWordLogic on CORRECT', () => {
    const { deps, getState } = createOfflineDeps({ gameState: GameState.PLAYING });
    applyOfflineGameAction(deps, { action: 'CORRECT' });
    expect(getState().currentRoundStats.correct).toBe(1);
    expect(deps.playSound).toHaveBeenCalledWith('correct');
    expect(deps.nextWordLogic).toHaveBeenCalled();
  });

  it('should move to ROUND_SUMMARY on CORRECT when timeUp is set', () => {
    const { deps, getState } = createOfflineDeps({
      gameState: GameState.PLAYING,
      timeUp: true,
    });
    applyOfflineGameAction(deps, { action: 'CORRECT' });
    expect(getState().gameState).toBe(GameState.ROUND_SUMMARY);
    expect(getState().timeUp).toBe(false);
    expect(deps.nextWordLogic).not.toHaveBeenCalled();
  });

  it('should transition to ROUND_SUMMARY on TIME_UP', () => {
    const { deps, getState } = createOfflineDeps({
      gameState: GameState.PLAYING,
      timeUp: true,
      timeLeft: 0,
    });
    applyOfflineGameAction(deps, { action: 'TIME_UP' });
    expect(getState().gameState).toBe(GameState.ROUND_SUMMARY);
    expect(getState().timeLeft).toBe(0);
    expect(deps.playSound).toHaveBeenCalledWith('end');
  });

  it('should increment skipped count on SKIP', () => {
    const { deps, getState } = createOfflineDeps({ gameState: GameState.PLAYING });
    applyOfflineGameAction(deps, { action: 'SKIP' });
    expect(getState().currentRoundStats.skipped).toBe(1);
    expect(deps.playSound).toHaveBeenCalledWith('skip');
  });

  it('should join team when teams array is still empty (lobby shells only)', () => {
    const { deps, getState } = createOfflineDeps({
      teams: [],
      settings: {
        ...initialState.settings,
        general: {
          ...initialState.settings.general,
          teamMode: 'TEAMS',
          teamCount: 2,
        },
      },
    });
    applyOfflineGameAction(deps, { action: 'TEAM_JOIN', data: { teamId: 'team-0' } });
    expect(getState().teams).toHaveLength(2);
    expect(getState().teams[0]?.players.map((p) => p.id)).toContain('host');
    applyOfflineGameAction(deps, {
      action: 'TEAM_JOIN',
      data: { teamId: 'team-1', playerId: 'guest' },
    });
    expect(getState().teams[1]?.players.map((p) => p.id)).toContain('guest');
  });

  it('should distribute all players across teams on GENERATE_TEAMS', () => {
    const players = Array.from({ length: 4 }, (_, i) => makePlayer(`p${i}`, `P${i}`));
    const { deps, getState } = createOfflineDeps({
      players,
      settings: {
        ...initialState.settings,
        general: { ...initialState.settings.general, teamCount: 2 },
      },
    });
    applyOfflineGameAction(deps, { action: 'GENERATE_TEAMS' });
    expect(getState().gameState).toBe(GameState.TEAMS);
    expect(getState().teams).toHaveLength(2);
    const assigned = getState().teams.reduce((n, t) => n + t.players.length, 0);
    expect(assigned).toBe(4);
  });

  it('should show error notification when ADD_OFFLINE_PLAYER exceeds MAX_PLAYERS', () => {
    const players = Array.from({ length: MAX_PLAYERS }, (_, i) =>
      makePlayer(`p${i}`, `Player ${i}`)
    );
    const { deps, getState } = createOfflineDeps({ players });
    applyOfflineGameAction(deps, { action: 'ADD_OFFLINE_PLAYER', data: {} });
    expect(getState().players).toHaveLength(MAX_PLAYERS);
    expect(getState().notification?.type).toBe('error');
    expect(getState().notification?.message).toContain(String(MAX_PLAYERS));
  });

  it('should add offline player when under MAX_PLAYERS limit', () => {
    const { deps, getState } = createOfflineDeps({ players: [makePlayer('host', 'Host')] });
    applyOfflineGameAction(deps, {
      action: 'ADD_OFFLINE_PLAYER',
      data: { name: 'Bob', avatar: '🐻' },
    });
    expect(getState().players).toHaveLength(2);
    expect(getState().players[1]?.name).toBe('Bob');
  });

  it('should remove offline player from teams when REMOVE_OFFLINE_PLAYER', () => {
    const extra = makePlayer('extra', 'Extra');
    const { deps, getState } = createOfflineDeps({
      players: [makePlayer('host', 'Host'), extra],
      teams: [
        {
          id: 'team-0',
          name: 'A',
          score: 0,
          color: 'c1',
          colorHex: '#111',
          players: [makePlayer('host', 'Host')],
          nextPlayerIndex: 0,
        },
        {
          id: 'team-1',
          name: 'B',
          score: 0,
          color: 'c2',
          colorHex: '#222',
          players: [extra],
          nextPlayerIndex: 0,
        },
      ],
      settings: {
        ...initialState.settings,
        general: { ...initialState.settings.general, teamCount: 2 },
      },
    });
    applyOfflineGameAction(deps, { action: 'REMOVE_OFFLINE_PLAYER', data: 'extra' });
    expect(getState().players.map((p) => p.id)).toEqual(['host']);
    expect(getState().teams[1]?.players).toHaveLength(0);
    expect(getState().teams[0]?.players.map((p) => p.id)).toEqual(['host']);
  });

  it('should reset team scores on REMATCH while preserving teams', () => {
    const { deps, getState } = createOfflineDeps({
      teams: [
        {
          id: 'team-0',
          name: 'A',
          score: 15,
          color: 'c1',
          colorHex: '#111',
          players: [makePlayer('host', 'Host')],
          nextPlayerIndex: 0,
        },
      ],
      gameState: GameState.GAME_OVER,
    });
    applyOfflineGameAction(deps, { action: 'REMATCH' });
    expect(getState().gameState).toBe(GameState.PRE_ROUND);
    expect(getState().teams[0]?.score).toBe(0);
  });

  it('should seed IMPOSTER reveal phase on START_GAME in IMPOSTER mode', () => {
    const { deps, getState } = createOfflineDeps({
      gameState: GameState.LOBBY,
      settings: {
        ...initialState.settings,
        general: { ...initialState.settings.general, teamMode: 'SOLO' },
        mode: { gameMode: GameMode.IMPOSTER, imposterDiscussionTime: 180 },
      },
    });
    applyOfflineGameAction(deps, { action: 'START_GAME' });
    expect(getState().imposterPhase).toBe('REVEAL');
    expect(getState().imposterPlayerId).toBeTruthy();
    expect(getState().teams).toHaveLength(2);
    expect(deps.nextOfflineImposterWord).toHaveBeenCalled();
  });
});
