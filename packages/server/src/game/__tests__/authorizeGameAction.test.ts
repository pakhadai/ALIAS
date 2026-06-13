import { describe, it, expect } from 'vitest';
import type { GameActionPayload, Player, Team } from '@movli/shared';
import {
  GameState,
  Language,
  Category,
  SoundPreset,
  AppTheme,
  GameMode,
  TEAM_COLORS,
} from '@movli/shared';
import type { Room } from '../../services/RoomManager';
import { authorizeGameAction, type GameActionAuthContext } from '../authorizeGameAction';

// ─── factories ───────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Alice',
    avatar: '🦊',
    isHost: true,
    stats: { explained: 0, guessed: 0 },
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> = {}): Team {
  const p1 = makePlayer({ id: 'p1', name: 'Alice', isHost: true });
  const p2 = makePlayer({ id: 'p2', name: 'Bob', isHost: false });
  return {
    id: 'team-0',
    name: 'Rockets',
    score: 0,
    color: TEAM_COLORS[0].varName ?? TEAM_COLORS[0].hex,
    colorHex: TEAM_COLORS[0].hex,
    players: [p1, p2],
    nextPlayerIndex: 0,
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  const host = makePlayer({ id: 'p1', isHost: true });
  const guest = makePlayer({ id: 'p2', isHost: false });
  const socketToPlayer = new Map<string, string>([
    ['socket-host', 'p1'],
    ['socket-guest', 'p2'],
  ]);
  return {
    code: '12345',
    hostSocketId: 'socket-host',
    hostPlayerId: 'p1',
    gameState: GameState.LOBBY,
    settings: {
      general: {
        language: Language.UA,
        scoreToWin: 30,
        skipPenalty: true,
        categories: [Category.GENERAL],
        soundEnabled: true,
        soundPreset: SoundPreset.FUN,
        teamMode: 'TEAMS',
        teamCount: 2,
        theme: AppTheme.PREMIUM_DARK,
      },
      mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 60 },
    },
    players: [host, guest],
    teams: [makeTeam()],
    currentTeamIndex: 0,
    wordDeck: [],
    currentWord: '',
    currentTask: null,
    currentRoundStats: {
      correct: 0,
      skipped: 0,
      words: [],
      teamId: 'team-0',
      explainerName: 'Alice',
    },
    timeLeft: 60,
    isPaused: false,
    timerInterval: null,
    socketToPlayer,
    roundsPlayed: 0,
    createdAt: Date.now(),
    usedWords: [],
    teamsLocked: false,
    ...overrides,
  };
}

function socketCtx(socketId: string): GameActionAuthContext {
  return { mode: 'socket', socketId };
}

function relayCtx(playerId: string): GameActionAuthContext {
  return { mode: 'relay', playerId };
}

type AuthCase = {
  name: string;
  room: Room;
  payload: GameActionPayload;
  ctx: GameActionAuthContext;
  expectOk: boolean;
  errorCode?: string;
};

function runAuthCase(c: AuthCase): void {
  const result = authorizeGameAction(c.room, c.payload, c.ctx);
  if (c.expectOk) {
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actorPlayerId).toBeTruthy();
    }
  } else {
    expect(result.ok).toBe(false);
    if (!result.ok && c.errorCode) {
      expect(result.error.code).toBe(c.errorCode);
    }
  }
}

// ─── host-only actions ───────────────────────────────────────────────────────

const HOST_ONLY_ACTIONS: GameActionPayload[] = [
  { action: 'START_GAME' },
  { action: 'START_DUEL' },
  { action: 'GENERATE_TEAMS' },
  { action: 'TEAM_SHUFFLE_UNASSIGNED' },
  { action: 'TEAM_SHUFFLE_ALL' },
  { action: 'TEAM_LOCK', data: { locked: true } },
  { action: 'TEAM_RENAME', data: { teamId: 'team-0', name: 'New' } },
  { action: 'NEXT_ROUND' },
  { action: 'CONFIRM_ROUND' },
  { action: 'RESET_GAME' },
  { action: 'REMATCH' },
  { action: 'UPDATE_SETTINGS', data: { general: { scoreToWin: 50 } } },
  { action: 'KICK_PLAYER', data: 'p2' },
];

describe('authorizeGameAction', () => {
  describe('host-only actions', () => {
    it.each(HOST_ONLY_ACTIONS.map((payload) => [payload.action, payload] as const))(
      'should reject %s when actor is not host (socket)',
      (_action, payload) => {
        runAuthCase({
          name: 'non-host socket',
          room: makeRoom(),
          payload,
          ctx: socketCtx('socket-guest'),
          expectOk: false,
          errorCode: 'NOT_HOST',
        });
      }
    );

    it('should allow START_GAME when actor is host (socket)', () => {
      runAuthCase({
        name: 'host START_GAME',
        room: makeRoom(),
        payload: { action: 'START_GAME' },
        ctx: socketCtx('socket-host'),
        expectOk: true,
      });
    });

    it('should allow host-only action via relay when playerId is hostPlayerId', () => {
      runAuthCase({
        name: 'relay host',
        room: makeRoom(),
        payload: { action: 'START_GAME' },
        ctx: relayCtx('p1'),
        expectOk: true,
      });
    });

    it('should reject host-only action via relay when playerId is not host', () => {
      runAuthCase({
        name: 'relay guest',
        room: makeRoom(),
        payload: { action: 'UPDATE_SETTINGS', data: { general: { scoreToWin: 40 } } },
        ctx: relayCtx('p2'),
        expectOk: false,
        errorCode: 'NOT_HOST',
      });
    });
  });

  // ─── team builder ──────────────────────────────────────────────────────────

  describe('team builder', () => {
    it('should reject TEAM_JOIN when teams are locked and actor is not host', () => {
      runAuthCase({
        name: 'locked TEAM_JOIN guest',
        room: makeRoom({ teamsLocked: true }),
        payload: { action: 'TEAM_JOIN', data: { teamId: 'team-0' } },
        ctx: socketCtx('socket-guest'),
        expectOk: false,
        errorCode: 'INVALID_ACTION',
      });
    });

    it('should reject TEAM_LEAVE when teams are locked and actor is not host', () => {
      runAuthCase({
        name: 'locked TEAM_LEAVE guest',
        room: makeRoom({ teamsLocked: true }),
        payload: { action: 'TEAM_LEAVE' },
        ctx: socketCtx('socket-guest'),
        expectOk: false,
        errorCode: 'INVALID_ACTION',
      });
    });

    it('should allow host TEAM_JOIN when teams are locked', () => {
      runAuthCase({
        name: 'locked TEAM_JOIN host',
        room: makeRoom({ teamsLocked: true }),
        payload: { action: 'TEAM_JOIN', data: { teamId: 'team-0', playerId: 'p2' } },
        ctx: socketCtx('socket-host'),
        expectOk: true,
      });
    });

    it('should reject TEAM_JOIN with playerId when actor is not host', () => {
      runAuthCase({
        name: 'assign guest',
        room: makeRoom(),
        payload: { action: 'TEAM_JOIN', data: { teamId: 'team-0', playerId: 'p2' } },
        ctx: socketCtx('socket-guest'),
        expectOk: false,
        errorCode: 'NOT_HOST',
      });
    });

    it('should allow TEAM_JOIN with playerId when actor is host', () => {
      runAuthCase({
        name: 'assign host',
        room: makeRoom(),
        payload: { action: 'TEAM_JOIN', data: { teamId: 'team-0', playerId: 'p2' } },
        ctx: socketCtx('socket-host'),
        expectOk: true,
      });
    });

    it('should allow self TEAM_JOIN when teams are unlocked (non-host)', () => {
      runAuthCase({
        name: 'self join',
        room: makeRoom({ teamsLocked: false }),
        payload: { action: 'TEAM_JOIN', data: { teamId: 'team-0' } },
        ctx: socketCtx('socket-guest'),
        expectOk: true,
      });
    });

    it('should reject TEAM_LEAVE with playerId when actor is not host', () => {
      runAuthCase({
        name: 'unassign guest',
        room: makeRoom(),
        payload: { action: 'TEAM_LEAVE', data: { playerId: 'p2' } },
        ctx: socketCtx('socket-guest'),
        expectOk: false,
        errorCode: 'NOT_HOST',
      });
    });

    it('should allow TEAM_LEAVE with playerId when actor is host', () => {
      runAuthCase({
        name: 'unassign host',
        room: makeRoom(),
        payload: { action: 'TEAM_LEAVE', data: { playerId: 'p2' } },
        ctx: socketCtx('socket-host'),
        expectOk: true,
      });
    });
  });

  // ─── IMPOSTER ──────────────────────────────────────────────────────────────

  describe('IMPOSTER actions', () => {
    it('should allow IMPOSTER_READY for any player in room (socket)', () => {
      runAuthCase({
        name: 'imposter ready guest',
        room: makeRoom(),
        payload: { action: 'IMPOSTER_READY' },
        ctx: socketCtx('socket-guest'),
        expectOk: true,
      });
    });

    it('should allow IMPOSTER_END_GAME for host (relay)', () => {
      runAuthCase({
        name: 'imposter end relay host',
        room: makeRoom(),
        payload: { action: 'IMPOSTER_END_GAME' },
        ctx: relayCtx('p1'),
        expectOk: true,
      });
    });

    it('should reject IMPOSTER_READY when socket is not in room', () => {
      runAuthCase({
        name: 'imposter unknown socket',
        room: makeRoom(),
        payload: { action: 'IMPOSTER_READY' },
        ctx: socketCtx('socket-unknown'),
        expectOk: false,
        errorCode: 'PLAYER_NOT_IN_ROOM',
      });
    });

    it('should reject IMPOSTER_END_GAME when relay playerId is not in room', () => {
      runAuthCase({
        name: 'imposter unknown relay',
        room: makeRoom(),
        payload: { action: 'IMPOSTER_END_GAME' },
        ctx: relayCtx('p99'),
        expectOk: false,
        errorCode: 'PLAYER_NOT_IN_ROOM',
      });
    });
  });

  // ─── explainer actions ─────────────────────────────────────────────────────

  describe('explainer actions', () => {
    const explainerActions: GameActionPayload[] = [
      { action: 'START_ROUND' },
      { action: 'START_PLAYING' },
      { action: 'CORRECT' },
      { action: 'SKIP' },
      { action: 'TIME_UP' },
    ];

    it.each(explainerActions.map((payload) => [payload.action, payload] as const))(
      'should reject %s when actor is not the explainer',
      (_action, payload) => {
        const team = makeTeam({ nextPlayerIndex: 0 });
        runAuthCase({
          name: 'non-explainer',
          room: makeRoom({
            teams: [team],
            currentTeamIndex: 0,
            currentRoundStats: {
              correct: 0,
              skipped: 0,
              words: [],
              teamId: 'team-0',
              explainerName: 'Alice',
              explainerId: 'p1',
            },
          }),
          payload,
          ctx: socketCtx('socket-guest'),
          expectOk: false,
          errorCode: 'NOT_EXPLAINER',
        });
      }
    );

    it('should allow START_ROUND when actor is upcoming explainer', () => {
      const team = makeTeam({ nextPlayerIndex: 0 });
      runAuthCase({
        name: 'start round explainer',
        room: makeRoom({ teams: [team], currentTeamIndex: 0 }),
        payload: { action: 'START_ROUND' },
        ctx: socketCtx('socket-host'),
        expectOk: true,
      });
    });

    it('should allow CORRECT when actor is current explainer', () => {
      runAuthCase({
        name: 'correct explainer',
        room: makeRoom({
          currentRoundStats: {
            correct: 0,
            skipped: 0,
            words: [],
            teamId: 'team-0',
            explainerName: 'Alice',
            explainerId: 'p1',
          },
        }),
        payload: { action: 'CORRECT' },
        ctx: socketCtx('socket-host'),
        expectOk: true,
      });
    });

    it('should allow SKIP for upcoming explainer when explainerId is not set', () => {
      const team = makeTeam({ nextPlayerIndex: 1 });
      runAuthCase({
        name: 'skip upcoming',
        room: makeRoom({
          teams: [team],
          currentRoundStats: {
            correct: 0,
            skipped: 0,
            words: [],
            teamId: 'team-0',
            explainerName: '',
          },
        }),
        payload: { action: 'SKIP' },
        ctx: socketCtx('socket-guest'),
        expectOk: true,
      });
    });
  });

  // ─── GUESS_OPTION (quiz — any player) ──────────────────────────────────────

  describe('GUESS_OPTION', () => {
    it('should allow GUESS_OPTION for any player in room (not blocked by authorize)', () => {
      runAuthCase({
        name: 'guess guest',
        room: makeRoom(),
        payload: { action: 'GUESS_OPTION', data: { selectedOption: 'A' } },
        ctx: socketCtx('socket-guest'),
        expectOk: true,
      });
    });

    it('should allow GUESS_OPTION for host via relay', () => {
      runAuthCase({
        name: 'guess relay host',
        room: makeRoom(),
        payload: { action: 'GUESS_OPTION', data: { selectedOption: 'B' } },
        ctx: relayCtx('p1'),
        expectOk: true,
      });
    });
  });

  describe('game-state guards', () => {
    it('should reject TEAM_JOIN during PLAYING', () => {
      runAuthCase({
        name: 'TEAM_JOIN in PLAYING',
        room: makeRoom({ gameState: GameState.PLAYING }),
        payload: { action: 'TEAM_JOIN', data: { teamId: 'team-0' } },
        ctx: socketCtx('socket-guest'),
        expectOk: false,
        errorCode: 'INVALID_STATE',
      });
    });

    it('should reject UPDATE_SETTINGS during PLAYING', () => {
      runAuthCase({
        name: 'UPDATE_SETTINGS in PLAYING',
        room: makeRoom({ gameState: GameState.PLAYING }),
        payload: { action: 'UPDATE_SETTINGS', data: { general: { scoreToWin: 40 } } },
        ctx: socketCtx('socket-host'),
        expectOk: false,
        errorCode: 'INVALID_STATE',
      });
    });

    it('should reject START_GAME outside LOBBY', () => {
      runAuthCase({
        name: 'START_GAME in PLAYING',
        room: makeRoom({ gameState: GameState.PLAYING }),
        payload: { action: 'START_GAME' },
        ctx: socketCtx('socket-host'),
        expectOk: false,
        errorCode: 'INVALID_STATE',
      });
    });

    it('should allow TEAM_JOIN in LOBBY', () => {
      runAuthCase({
        name: 'TEAM_JOIN in LOBBY',
        room: makeRoom({ gameState: GameState.LOBBY }),
        payload: { action: 'TEAM_JOIN', data: { teamId: 'team-0' } },
        ctx: socketCtx('socket-guest'),
        expectOk: true,
      });
    });
  });

  // ─── socket / relay identity ─────────────────────────────────────────────────

  describe('actor identity', () => {
    it('should reject action when socket is not mapped to a player', () => {
      runAuthCase({
        name: 'unknown socket',
        room: makeRoom(),
        payload: { action: 'PAUSE_GAME' },
        ctx: socketCtx('socket-stranger'),
        expectOk: false,
        errorCode: 'PLAYER_NOT_IN_ROOM',
      });
    });

    it('should treat migrated host as host when hostPlayerId matches (relay)', () => {
      const room = makeRoom({
        hostSocketId: 'socket-old',
        hostPlayerId: 'p1',
        socketToPlayer: new Map([
          ['socket-new', 'p1'],
          ['socket-guest', 'p2'],
        ]),
      });
      runAuthCase({
        name: 'migrated host relay',
        room,
        payload: { action: 'REMATCH' },
        ctx: relayCtx('p1'),
        expectOk: true,
      });
    });

    it('should promote migrated host socketId when hostPlayerId matches (socket)', () => {
      const room = makeRoom({
        hostSocketId: 'socket-old',
        hostPlayerId: 'p1',
        socketToPlayer: new Map([
          ['socket-new', 'p1'],
          ['socket-guest', 'p2'],
        ]),
      });
      const result = authorizeGameAction(room, { action: 'START_GAME' }, socketCtx('socket-new'));
      expect(result.ok).toBe(true);
      expect(room.hostSocketId).toBe('socket-new');
    });

    it('should reject relay action when playerId is not in room players list', () => {
      runAuthCase({
        name: 'relay stranger',
        room: makeRoom(),
        payload: { action: 'PAUSE_GAME' },
        ctx: relayCtx('p99'),
        expectOk: false,
        errorCode: 'PLAYER_NOT_IN_ROOM',
      });
    });
  });
});
