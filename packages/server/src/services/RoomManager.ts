import { v4 as uuidv4 } from 'uuid';
import {
  GameState, Language, Category, SoundPreset, AppTheme,
  ROOM_CODE_LENGTH, TEAM_COLORS, MAX_PLAYERS,
} from '@alias/shared';
import type {
  Player, Team, GameSettings, RoundStats, GameSyncState,
} from '@alias/shared';

export interface Room {
  code: string;
  hostSocketId: string;
  hostPlayerId: string;
  gameState: GameState;
  settings: GameSettings;
  players: Player[];
  teams: Team[];
  currentTeamIndex: number;
  wordDeck: string[];
  currentWord: string;
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  timerInterval: ReturnType<typeof setInterval> | null;
  // socketId -> playerId mapping
  socketToPlayer: Map<string, string>;
}

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

const defaultRoundStats: RoundStats = {
  correct: 0,
  skipped: 0,
  words: [],
  teamId: '',
  explainerName: '',
};

export class RoomManager {
  private rooms = new Map<string, Room>();

  generateRoomCode(): string {
    let code: string;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId: string): Room {
    const code = this.generateRoomCode();
    const hostPlayerId = uuidv4();
    const room: Room = {
      code,
      hostSocketId,
      hostPlayerId,
      gameState: GameState.LOBBY,
      settings: { ...defaultSettings },
      players: [],
      teams: [],
      currentTeamIndex: 0,
      wordDeck: [],
      currentWord: '',
      currentRoundStats: { ...defaultRoundStats },
      timeLeft: 0,
      isPaused: false,
      timerInterval: null,
      socketToPlayer: new Map(),
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  addPlayer(roomCode: string, socketId: string, name: string, avatar: string): Player | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.players.length >= MAX_PLAYERS) return null;

    const playerId = uuidv4();
    const player: Player = {
      id: playerId,
      name: name.replace(/<[^>]*>/g, '').slice(0, 20),
      avatar,
      isHost: socketId === room.hostSocketId,
      stats: { explained: 0 },
    };

    room.players.push(player);
    room.socketToPlayer.set(socketId, playerId);
    return player;
  }

  removePlayer(roomCode: string, socketId: string): string | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return null;

    room.players = room.players.filter((p) => p.id !== playerId);
    room.teams = room.teams.map((team) => {
      const newPlayers = team.players.filter((p) => p.id !== playerId);
      return {
        ...team,
        players: newPlayers,
        nextPlayerIndex:
          team.nextPlayerIndex >= newPlayers.length
            ? Math.max(0, newPlayers.length - 1)
            : team.nextPlayerIndex,
      };
    });
    room.socketToPlayer.delete(socketId);

    return playerId;
  }

  handleDisconnect(socketId: string): void {
    for (const [code, room] of this.rooms) {
      if (room.socketToPlayer.has(socketId)) {
        this.removePlayer(code, socketId);

        // If host disconnected or room is empty, clean up
        if (socketId === room.hostSocketId || room.players.length === 0) {
          if (room.timerInterval) clearInterval(room.timerInterval);
          this.rooms.delete(code);
        }
        break;
      }
    }
  }

  getPlayerSocketId(room: Room, playerId: string): string | undefined {
    for (const [socketId, pId] of room.socketToPlayer) {
      if (pId === playerId) return socketId;
    }
    return undefined;
  }

  getSyncState(room: Room): GameSyncState {
    return {
      gameState: room.gameState,
      settings: room.settings,
      roomCode: room.code,
      players: room.players,
      teams: room.teams,
      currentTeamIndex: room.currentTeamIndex,
      currentWord: room.currentWord,
      currentRoundStats: room.currentRoundStats,
      timeLeft: room.timeLeft,
      isPaused: room.isPaused,
      wordDeck: room.wordDeck,
    };
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room?.timerInterval) clearInterval(room.timerInterval);
    this.rooms.delete(code);
  }
}
