import type { GameSettings, Player, Team, RoundStats, GameActionPayload } from './types';
import type { GameState } from './enums';

// Client -> Server events
export interface ClientToServerEvents {
  'room:create': (data: { playerName: string; avatar: string }) => void;
  'room:join': (data: { roomCode: string; playerName: string; avatar: string }) => void;
  'room:leave': () => void;
  'room:rejoin': (data: { roomCode: string; playerId: string }) => void;
  'game:action': (payload: GameActionPayload) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room:created': (data: { roomCode: string; playerId: string }) => void;
  'room:joined': (data: { roomCode: string; playerId: string }) => void;
  'room:rejoined': (data: { roomCode: string; playerId: string }) => void;
  'room:error': (data: { message: string }) => void;
  'room:player-joined': (data: { player: Player }) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'game:state-sync': (state: GameSyncState) => void;
  'game:notification': (data: { message: string; type: 'info' | 'error' | 'success' }) => void;
  'player:kicked': () => void;
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
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  wordDeck: string[];
}

// Inter-server events (for scaling)
export interface InterServerEvents {}

// Socket data attached to each connection
export interface SocketData {
  userId?: string;
  playerId: string;
  playerName: string;
  roomCode: string;
}
