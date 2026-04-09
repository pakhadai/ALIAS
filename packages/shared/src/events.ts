import type { GameActionPayload } from './actions';
import type { GameSettings, GameTask, Player, Team, RoundStats } from './models';
import type { GameState } from './enums';

/** Stable codes for `room:error` — clients may branch on `code`; `message` stays human-readable. */
export const ROOM_ERROR_CODES = [
  'INVALID_PAYLOAD',
  'ROOM_CREATE_FAILED',
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'INVALID_ACTION',
  'NOT_HOST',
  'NOT_EXPLAINER',
  'PLAYER_NOT_IN_ROOM',
  'RELAY_UNAVAILABLE',
  'RELAY_TIMEOUT',
  'ALREADY_IN_ROOM',
] as const;

export type RoomErrorCode = (typeof ROOM_ERROR_CODES)[number];

export interface RoomErrorPayload {
  code: RoomErrorCode;
  message: string;
}

// Client -> Server events
export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; avatar: string; avatarId?: string | null }) => void;
  /**
   * Lightweight room existence check used by the join-code screen.
   * Uses Socket.IO ack to avoid adding a separate REST endpoint.
   */
  'room:exists': (data: { roomCode: string }, cb: (res: { exists: boolean }) => void) => void;
  'room:join': (data: {
    roomCode: string;
    playerName: string;
    avatar: string;
    avatarId?: string | null;
  }) => void;
  'room:leave': () => void;
  'room:rejoin': (data: { roomCode: string; playerId: string }) => void;
  'game:action': (payload: GameActionPayload) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; playerId: string }) => void;
  'room:joined': (data: { roomCode: string; playerId: string }) => void;
  'room:rejoined': (data: { roomCode: string; playerId: string }) => void;
  'room:error': (data: RoomErrorPayload) => void;
  'room:player-joined': (data: { player: Player }) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'game:state-sync': (state: GameSyncState) => void;
  /** IMPOSTER mode: per-player secret payload (never broadcast to the whole room). */
  'imposter:secret': (data: { isImposter: boolean; word: string | null }) => void;
  'game:notification': (data: { message: string; type: 'info' | 'error' | 'success' }) => void;
  /** Emitted to the whole room so kicked clients work across Socket.IO nodes (adapter). */
  'player:kicked': (data: { playerId: string }) => void;
}

// Full game state synced from server to clients
export interface GameSyncState {
  gameState: GameState;
  settings: GameSettings;
  roomCode: string;
  players: Player[];
  teams: Team[];
  currentTeamIndex: number;
  currentWord: string;
  currentTask: GameTask | null;
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  timeUp?: boolean;
  wordDeck: string[];
  /** IMPOSTER (public state only; word is never included here). */
  imposterPhase?: 'REVEAL' | 'DISCUSSION' | 'RESULTS';
  imposterPlayerId?: string;
  revealedPlayerIds?: string[];
  /** Lobby/team builder: when true, players cannot self-switch teams (host can still shuffle/rename). */
  teamsLocked?: boolean;
}

// Inter-server events (for scaling)
export type InterServerEvents = Record<string, never>;

// Socket data attached to each connection
export interface SocketData {
  userId?: string;
  playerId?: string;
  playerName?: string;
  roomCode?: string;
}
