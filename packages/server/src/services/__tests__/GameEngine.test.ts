import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameEngine } from '../GameEngine';
import { WordService } from '../WordService';
import { RoomManager } from '../RoomManager';
import {
  GameState, Language, Category, SoundPreset, AppTheme, TEAM_COLORS,
} from '@alias/shared';
import type { Room } from '../RoomManager';
import type { Player, Team, GameSettings } from '@alias/shared';

// ─── helpers ────────────────────────────────────────────────────────────────

const defaultSettings: GameSettings = {
  language: Language.UA,
  roundTime: 60,
  scoreToWin: 30,
  skipPenalty: true,
  categories: [Category.GENERAL],
  soundEnabled: true,
  soundPreset: SoundPreset.FUN,
  teamCount: 2,
  theme: AppTheme.PREMIUM_DARK,
};

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Alice',
    avatar: '🦊',
    isHost: false,
    stats: { explained: 0, guessed: 0 },
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-0',
    name: 'Rockets',
    score: 0,
    color: TEAM_COLORS[0].class,
    colorHex: TEAM_COLORS[0].hex,
    players: [makePlayer()],
    nextPlayerIndex: 0,
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    code: '12345',
    hostSocketId: 'socket-1',
    hostPlayerId: 'p1',
    gameState: GameState.LOBBY,
    settings: { ...defaultSettings },
    players: [makePlayer()],
    teams: [],
    currentTeamIndex: 0,
    wordDeck: [],
    currentWord: '',
    currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: '', explainerName: '' },
    timeLeft: 0,
    isPaused: false,
    timerInterval: null,
    socketToPlayer: new Map(),
    roundsPlayed: 0,
    ...overrides,
  };
}

// ─── setup ──────────────────────────────────────────────────────────────────

let wordService: WordService;
let roomManager: RoomManager;
let engine: GameEngine;

beforeEach(() => {
  vi.useFakeTimers();
  wordService = new WordService();
  roomManager = new RoomManager();
  engine = new GameEngine(roomManager, wordService);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── GENERATE_TEAMS ─────────────────────────────────────────────────────────

describe('GENERATE_TEAMS', () => {
  it('distributes all players across teams', async () => {
    const players = ['Alice', 'Bob', 'Charlie', 'Dave'].map((name, i) =>
      makePlayer({ id: `p${i}`, name }),
    );
    const room = makeRoom({ players, settings: { ...defaultSettings, teamCount: 2 } });

    await engine.handleAction(room, { action: 'GENERATE_TEAMS' });

    const totalInTeams = room.teams.reduce((s, t) => s + t.players.length, 0);
    expect(totalInTeams).toBe(4);
    expect(room.teams).toHaveLength(2);
    expect(room.gameState).toBe(GameState.TEAMS);
  });

  it('caps team count at player count', async () => {
    const room = makeRoom({ players: [makePlayer()], settings: { ...defaultSettings, teamCount: 4 } });
    await engine.handleAction(room, { action: 'GENERATE_TEAMS' });
    expect(room.teams).toHaveLength(1);
  });

  it('each team gets a unique TEAM_COLORS entry', async () => {
    const players = Array.from({ length: 3 }, (_, i) => makePlayer({ id: `p${i}`, name: `P${i}` }));
    const room = makeRoom({ players, settings: { ...defaultSettings, teamCount: 3 } });
    await engine.handleAction(room, { action: 'GENERATE_TEAMS' });
    const hexes = room.teams.map(t => t.colorHex);
    expect(new Set(hexes).size).toBe(3);
  });
});

// ─── START_GAME ─────────────────────────────────────────────────────────────

describe('START_GAME', () => {
  it('sets gameState to PRE_ROUND and resets currentTeamIndex', async () => {
    const room = makeRoom({ currentTeamIndex: 2 });
    await engine.handleAction(room, { action: 'START_GAME' });
    expect(room.gameState).toBe(GameState.PRE_ROUND);
    expect(room.currentTeamIndex).toBe(0);
    expect(room.roundsPlayed).toBe(0);
  });
});

// ─── START_ROUND ─────────────────────────────────────────────────────────────

describe('START_ROUND', () => {
  it('sets COUNTDOWN and initialises roundStats', async () => {
    const team = makeTeam({ id: 'team-0', players: [makePlayer({ id: 'p1', name: 'Alice' })] });
    const room = makeRoom({ teams: [team], currentTeamIndex: 0 });
    await engine.handleAction(room, { action: 'START_ROUND' });
    expect(room.gameState).toBe(GameState.COUNTDOWN);
    expect(room.currentRoundStats.teamId).toBe('team-0');
    expect(room.currentRoundStats.explainerName).toBe('Alice');
    expect(room.currentRoundStats.explainerId).toBe('p1');
    expect(room.currentRoundStats.correct).toBe(0);
  });

  it('falls back to LOBBY when team has no players', async () => {
    const room = makeRoom({ teams: [makeTeam({ players: [] })], currentTeamIndex: 0 });
    await engine.handleAction(room, { action: 'START_ROUND' });
    expect(room.gameState).toBe(GameState.LOBBY);
  });

  it('picks player at nextPlayerIndex', async () => {
    const players = [makePlayer({ id: 'p0', name: 'Alice' }), makePlayer({ id: 'p1', name: 'Bob' })];
    const team = makeTeam({ players, nextPlayerIndex: 1 });
    const room = makeRoom({ teams: [team], currentTeamIndex: 0 });
    await engine.handleAction(room, { action: 'START_ROUND' });
    expect(room.currentRoundStats.explainerName).toBe('Bob');
  });
});

// ─── START_PLAYING ───────────────────────────────────────────────────────────

describe('START_PLAYING', () => {
  it('sets PLAYING state, resets time and fetches first word', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'Кіт', deck: ['Собака'] });
    const room = makeRoom();
    await engine.handleAction(room, { action: 'START_PLAYING' });
    expect(room.gameState).toBe(GameState.PLAYING);
    expect(room.currentWord).toBe('Кіт');
    expect(room.timeLeft).toBe(defaultSettings.roundTime);
    expect(room.isPaused).toBe(false);
  });

  it('starts a countdown timer', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'Test', deck: [] });
    const room = makeRoom({ settings: { ...defaultSettings, roundTime: 5 } });
    await engine.handleAction(room, { action: 'START_PLAYING' });
    expect(room.timerInterval).not.toBeNull();
  });
});

// ─── CORRECT / SKIP ──────────────────────────────────────────────────────────

describe('CORRECT', () => {
  it('increments correct count and fetches next word', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'Next', deck: [] });
    const room = makeRoom({ currentWord: 'Кіт', currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: 't1', explainerName: 'Alice' } });
    await engine.handleAction(room, { action: 'CORRECT' });
    expect(room.currentRoundStats.correct).toBe(1);
    expect(room.currentRoundStats.words).toHaveLength(1);
    expect(room.currentRoundStats.words[0]).toEqual({ word: 'Кіт', result: 'correct' });
    expect(room.currentWord).toBe('Next');
  });
});

describe('SKIP', () => {
  it('increments skipped count and fetches next word', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'Next', deck: [] });
    const room = makeRoom({ currentWord: 'Собака', currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: 't1', explainerName: 'Alice' } });
    await engine.handleAction(room, { action: 'SKIP' });
    expect(room.currentRoundStats.skipped).toBe(1);
    expect(room.currentRoundStats.words[0]).toEqual({ word: 'Собака', result: 'skipped' });
  });
});

// ─── PAUSE_GAME ──────────────────────────────────────────────────────────────

describe('PAUSE_GAME', () => {
  it('toggles isPaused', async () => {
    const room = makeRoom({ isPaused: false });
    await engine.handleAction(room, { action: 'PAUSE_GAME' });
    expect(room.isPaused).toBe(true);
    await engine.handleAction(room, { action: 'PAUSE_GAME' });
    expect(room.isPaused).toBe(false);
  });
});

// ─── TIME_UP ─────────────────────────────────────────────────────────────────

describe('TIME_UP', () => {
  it('stops timer and sets ROUND_SUMMARY', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'X', deck: [] });
    const room = makeRoom();
    await engine.handleAction(room, { action: 'START_PLAYING' });
    await engine.handleAction(room, { action: 'TIME_UP' });
    expect(room.gameState).toBe(GameState.ROUND_SUMMARY);
    expect(room.timeLeft).toBe(0);
    expect(room.timerInterval).toBeNull();
  });
});

// ─── CONFIRM_ROUND ───────────────────────────────────────────────────────────

describe('CONFIRM_ROUND', () => {
  it('adds points to the scoring team', async () => {
    const team = makeTeam({ id: 't0', score: 0, players: [makePlayer({ id: 'explainer' })] });
    const room = makeRoom({
      teams: [team],
      currentTeamIndex: 0,
      roundsPlayed: 0,
      currentRoundStats: { correct: 5, skipped: 1, words: [], teamId: 't0', explainerName: 'Alice', explainerId: 'explainer' },
      settings: { ...defaultSettings, skipPenalty: true, scoreToWin: 30 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    // 5 correct - 1 skip = 4 points
    expect(room.teams[0].score).toBe(4);
    expect(room.roundsPlayed).toBe(1);
    expect(room.gameState).toBe(GameState.SCOREBOARD);
  });

  it('score never goes below 0 with skip penalty', async () => {
    const team = makeTeam({ id: 't0', score: 0 });
    const room = makeRoom({
      teams: [team],
      currentTeamIndex: 0,
      roundsPlayed: 0,
      currentRoundStats: { correct: 0, skipped: 10, words: [], teamId: 't0', explainerName: 'Alice' },
      settings: { ...defaultSettings, skipPenalty: true, scoreToWin: 30 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    expect(room.teams[0].score).toBe(0);
  });

  it('does not subtract skips when skipPenalty is off', async () => {
    const team = makeTeam({ id: 't0', score: 0 });
    const room = makeRoom({
      teams: [team],
      currentTeamIndex: 0,
      roundsPlayed: 0,
      currentRoundStats: { correct: 3, skipped: 5, words: [], teamId: 't0', explainerName: 'Alice' },
      settings: { ...defaultSettings, skipPenalty: false, scoreToWin: 30 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    expect(room.teams[0].score).toBe(3);
  });

  it('triggers GAME_OVER when last team exceeds scoreToWin', async () => {
    const team = makeTeam({ id: 't0', score: 27 });
    const room = makeRoom({
      teams: [team],
      currentTeamIndex: 0, // last team (only 1 team)
      currentRoundStats: { correct: 5, skipped: 0, words: [], teamId: 't0', explainerName: 'Alice' },
      settings: { ...defaultSettings, skipPenalty: false, scoreToWin: 30 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    expect(room.teams[0].score).toBe(32);
    expect(room.gameState).toBe(GameState.GAME_OVER);
  });

  it('goes to SCOREBOARD not GAME_OVER when not the last team', async () => {
    const teams = [
      makeTeam({ id: 't0', score: 29 }),
      makeTeam({ id: 't1', score: 0 }),
    ];
    const room = makeRoom({
      teams,
      currentTeamIndex: 0, // not the last team
      currentRoundStats: { correct: 5, skipped: 0, words: [], teamId: 't0', explainerName: 'Alice' },
      settings: { ...defaultSettings, skipPenalty: false, scoreToWin: 30 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    expect(room.gameState).toBe(GameState.SCOREBOARD);
  });

  it('updates guessed stats for non-explainer players', async () => {
    const explainer = makePlayer({ id: 'explainer', name: 'Alice', stats: { explained: 0, guessed: 0 } });
    const guesser = makePlayer({ id: 'guesser', name: 'Bob', stats: { explained: 0, guessed: 0 } });
    const team = makeTeam({ id: 't0', score: 0, players: [explainer, guesser] });
    const room = makeRoom({
      teams: [team],
      currentTeamIndex: 0,
      currentRoundStats: { correct: 3, skipped: 0, words: [], teamId: 't0', explainerName: 'Alice', explainerId: 'explainer' },
      settings: { ...defaultSettings, skipPenalty: false, scoreToWin: 100 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    const updatedExplainer = room.teams[0].players.find(p => p.id === 'explainer')!;
    const updatedGuesser = room.teams[0].players.find(p => p.id === 'guesser')!;
    expect(updatedExplainer.stats.guessed).toBe(0);
    expect(updatedGuesser.stats.guessed).toBe(3);
  });

  it('advances nextPlayerIndex for active team', async () => {
    const players = [makePlayer({ id: 'p0' }), makePlayer({ id: 'p1' })];
    const team = makeTeam({ id: 't0', players, nextPlayerIndex: 0 });
    const room = makeRoom({
      teams: [team],
      currentTeamIndex: 0,
      currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: 't0', explainerName: 'P0' },
      settings: { ...defaultSettings, skipPenalty: false, scoreToWin: 100 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    expect(room.teams[0].nextPlayerIndex).toBe(1);
  });

  it('wraps nextPlayerIndex back to 0', async () => {
    const players = [makePlayer({ id: 'p0' }), makePlayer({ id: 'p1' })];
    const team = makeTeam({ id: 't0', players, nextPlayerIndex: 1 });
    const room = makeRoom({
      teams: [team],
      currentTeamIndex: 0,
      currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: 't0', explainerName: 'P1' },
      settings: { ...defaultSettings, skipPenalty: false, scoreToWin: 100 },
    });
    await engine.handleAction(room, { action: 'CONFIRM_ROUND' });
    expect(room.teams[0].nextPlayerIndex).toBe(0);
  });
});

// ─── NEXT_ROUND ──────────────────────────────────────────────────────────────

describe('NEXT_ROUND', () => {
  it('advances currentTeamIndex and sets PRE_ROUND', async () => {
    const room = makeRoom({
      teams: [makeTeam(), makeTeam({ id: 'team-1' })],
      currentTeamIndex: 0,
      gameState: GameState.SCOREBOARD,
    });
    await engine.handleAction(room, { action: 'NEXT_ROUND' });
    expect(room.currentTeamIndex).toBe(1);
    expect(room.gameState).toBe(GameState.PRE_ROUND);
  });

  it('wraps currentTeamIndex around', async () => {
    const room = makeRoom({
      teams: [makeTeam(), makeTeam({ id: 'team-1' })],
      currentTeamIndex: 1,
      gameState: GameState.SCOREBOARD,
    });
    await engine.handleAction(room, { action: 'NEXT_ROUND' });
    expect(room.currentTeamIndex).toBe(0);
  });

  it('does nothing when teams array is empty', async () => {
    const room = makeRoom({ teams: [], currentTeamIndex: 0, gameState: GameState.SCOREBOARD });
    await engine.handleAction(room, { action: 'NEXT_ROUND' });
    expect(room.currentTeamIndex).toBe(0);
  });
});

// ─── RESET_GAME ──────────────────────────────────────────────────────────────

describe('RESET_GAME', () => {
  it('resets all game state to lobby defaults', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'X', deck: [] });
    const room = makeRoom({ gameState: GameState.PLAYING, currentWord: 'Test', timeLeft: 30 });
    await engine.handleAction(room, { action: 'START_PLAYING' });
    await engine.handleAction(room, { action: 'RESET_GAME' });

    expect(room.gameState).toBe(GameState.LOBBY);
    expect(room.teams).toHaveLength(0);
    expect(room.currentTeamIndex).toBe(0);
    expect(room.currentWord).toBe('');
    expect(room.wordDeck).toHaveLength(0);
    expect(room.timeLeft).toBe(0);
    expect(room.isPaused).toBe(false);
    expect(room.timerInterval).toBeNull();
  });
});

// ─── REMATCH ─────────────────────────────────────────────────────────────────

describe('REMATCH', () => {
  it('resets scores but keeps teams', async () => {
    const teams = [
      makeTeam({ id: 't0', score: 10, nextPlayerIndex: 2 }),
      makeTeam({ id: 't1', score: 20, nextPlayerIndex: 1 }),
    ];
    const room = makeRoom({ teams, gameState: GameState.GAME_OVER, currentTeamIndex: 1 });
    await engine.handleAction(room, { action: 'REMATCH' });

    expect(room.gameState).toBe(GameState.PRE_ROUND);
    expect(room.teams).toHaveLength(2);
    expect(room.teams[0].score).toBe(0);
    expect(room.teams[1].score).toBe(0);
    expect(room.teams[0].nextPlayerIndex).toBe(0);
    expect(room.currentTeamIndex).toBe(0);
    expect(room.wordDeck).toHaveLength(0);
  });
});

// ─── KICK_PLAYER ─────────────────────────────────────────────────────────────

describe('KICK_PLAYER', () => {
  it('removes player from players list', async () => {
    const p1 = makePlayer({ id: 'p1', name: 'Alice' });
    const p2 = makePlayer({ id: 'p2', name: 'Bob' });
    const room = makeRoom({ players: [p1, p2] });
    await engine.handleAction(room, { action: 'KICK_PLAYER', data: 'p1' });
    expect(room.players.find(p => p.id === 'p1')).toBeUndefined();
    expect(room.players.find(p => p.id === 'p2')).toBeDefined();
  });

  it('removes player from teams', async () => {
    const p1 = makePlayer({ id: 'p1', name: 'Alice' });
    const p2 = makePlayer({ id: 'p2', name: 'Bob' });
    const team = makeTeam({ players: [p1, p2] });
    const room = makeRoom({ players: [p1, p2], teams: [team] });
    await engine.handleAction(room, { action: 'KICK_PLAYER', data: 'p1' });
    expect(room.teams[0].players.find(p => p.id === 'p1')).toBeUndefined();
  });

  it('clamps nextPlayerIndex when kicked player was last', async () => {
    const players = [makePlayer({ id: 'p0' }), makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const team = makeTeam({ players, nextPlayerIndex: 2 });
    const room = makeRoom({ players, teams: [team] });
    await engine.handleAction(room, { action: 'KICK_PLAYER', data: 'p2' });
    expect(room.teams[0].nextPlayerIndex).toBe(1);
  });
});

// ─── UPDATE_SETTINGS ─────────────────────────────────────────────────────────

describe('UPDATE_SETTINGS', () => {
  it('merges new settings into room', async () => {
    const room = makeRoom();
    await engine.handleAction(room, { action: 'UPDATE_SETTINGS', data: { roundTime: 90, language: Language.EN } });
    expect(room.settings.roundTime).toBe(90);
    expect(room.settings.language).toBe(Language.EN);
    expect(room.settings.scoreToWin).toBe(defaultSettings.scoreToWin);
  });
});

// ─── START_DUEL ──────────────────────────────────────────────────────────────

describe('START_DUEL', () => {
  it('creates one team per player and sets VS_SCREEN', async () => {
    const players = [makePlayer({ id: 'p0', name: 'Alice' }), makePlayer({ id: 'p1', name: 'Bob' })];
    const room = makeRoom({ players });
    await engine.handleAction(room, { action: 'START_DUEL' });
    expect(room.teams).toHaveLength(2);
    expect(room.teams[0].players[0].id).toBe('p0');
    expect(room.teams[1].players[0].id).toBe('p1');
    expect(room.gameState).toBe(GameState.VS_SCREEN);
  });
});

// ─── timer integration ───────────────────────────────────────────────────────

describe('Timer', () => {
  it('decrements timeLeft every second and fires TIME_UP at 0', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'X', deck: [] });
    const room = makeRoom({ settings: { ...defaultSettings, roundTime: 3 } });
    await engine.handleAction(room, { action: 'START_PLAYING' });
    expect(room.timeLeft).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(room.timeLeft).toBe(2);
    vi.advanceTimersByTime(2000);
    expect(room.gameState).toBe(GameState.ROUND_SUMMARY);
    expect(room.timerInterval).toBeNull();
  });

  it('does not decrement while paused', async () => {
    vi.spyOn(wordService, 'nextWord').mockResolvedValue({ word: 'X', deck: [] });
    const room = makeRoom({ settings: { ...defaultSettings, roundTime: 10 } });
    await engine.handleAction(room, { action: 'START_PLAYING' });
    room.isPaused = true;
    vi.advanceTimersByTime(3000);
    expect(room.timeLeft).toBe(10);
  });
});
