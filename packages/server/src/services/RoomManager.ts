import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  Language,
  Category,
  SoundPreset,
  AppTheme,
  GameMode,
  MAX_PLAYERS,
  TEAM_COLORS,
} from '@alias/shared';
import type {
  Player,
  Team,
  GameSettings,
  GameTask,
  RoundStats,
  GameSyncState,
} from '@alias/shared';
import { RedisRoomStore } from './RedisRoomStore';
import { config } from '../config';

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
  currentTask: GameTask | null;
  currentTaskAnswered?: string;
  currentRoundStats: RoundStats;
  timeLeft: number;
  isPaused: boolean;
  timeUp?: boolean;
  timerInterval: ReturnType<typeof setInterval> | null;
  socketToPlayer: Map<string, string>;
  sessionId?: string;
  roundsPlayed: number;
  hostUserId?: string;
  createdAt: number;
  usedWords: string[];
  // ─── IMPOSTER runtime state (public+secret) ───────────────────────────────
  imposterPlayerId?: string;
  /** Secret word (never included in GameSyncState). */
  imposterWord?: string;
  imposterPhase?: 'REVEAL' | 'DISCUSSION' | 'RESULTS';
  /** Players who already revealed their card (ids). */
  revealedPlayerIds?: string[];
  /** Lobby/team builder: when true, players cannot self-switch teams (host can still edit). */
  teamsLocked?: boolean;
}

const defaultSettings: GameSettings = {
  general: {
    language: Language.UA,
    scoreToWin: 30,
    skipPenalty: true,
    categories: [Category.GENERAL],
    soundEnabled: true,
    soundPreset: SoundPreset.FUN,
    teamCount: 2,
    theme: AppTheme.PREMIUM_DARK,
  },
  mode: {
    gameMode: GameMode.CLASSIC,
    classicRoundTime: 60,
  },
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
  private redisStore: RedisRoomStore | null = null;
  /** Throttle cross-instance writer warnings (persistRoom is hot). */
  private writerMismatchLoggedAt = new Map<string, number>();

  constructor() {
    // Clean up stale empty rooms every 30 minutes (rooms idle for 2+ hours)
    setInterval(
      () => {
        const cutoff = Date.now() - 2 * 60 * 60 * 1000;
        for (const [code, room] of this.rooms) {
          if (room.players.length === 0 && room.createdAt < cutoff) {
            if (room.timerInterval) clearInterval(room.timerInterval);
            this.rooms.delete(code);
            this.clearWriterMismatchThrottle(code);
            this.redisStore?.deleteRoom(code).catch(() => {});
          }
        }
      },
      30 * 60 * 1000
    );
  }

  setRedisStore(store: RedisRoomStore): void {
    this.redisStore = store;
  }

  private clearWriterMismatchThrottle(roomCode: string): void {
    this.writerMismatchLoggedAt.delete(roomCode);
  }

  /** Persist current room state to Redis (fire-and-forget) */
  persistRoom(room: Room): void {
    if (!this.redisStore?.isConnected) return;
    const store = this.redisStore;
    const code = room.code;
    const state = this.getSyncState(room);
    const selfId = config.serverInstanceId;
    // Capture imposterWord at call time — the async closure must not read stale room state.
    const imposterWord = room.imposterWord;

    void (async () => {
      try {
        const writer = await store.getRoomWriter(code);
        if (writer && writer !== selfId) {
          const now = Date.now();
          const last = this.writerMismatchLoggedAt.get(code) ?? 0;
          if (now - last > 60_000) {
            this.writerMismatchLoggedAt.set(code, now);
            console.warn(
              `[RoomManager] Redis writer ≠ this instance for room ${code}: redis=${writer} local=${selfId} — likely missing sticky sessions on the load balancer`
            );
          }
        }
      } catch {
        /* ignore */
      }
      try {
        await store.saveRoomState(code, state, selfId);
        // Persist imposterWord under a separate key — it must never appear in GameSyncState
        // because that state is broadcast to all clients. A separate key ensures the secret
        // survives server restarts without leaking to non-imposter players.
        if (imposterWord !== undefined && imposterWord !== '') {
          await store.saveImposterWord(code, imposterWord);
        } else {
          await store.deleteImposterWord(code);
        }
      } catch {
        /* ignore */
      }
    })();
  }

  /** Track socket-to-room mapping in Redis */
  private persistSocket(socketId: string, roomCode: string, playerId: string): void {
    if (!this.redisStore?.isConnected) return;
    this.redisStore.setSocketRoom(socketId, roomCode, playerId).catch(() => {});
  }

  /** After `room:rejoin`, mirror `addPlayer` — store socket mapping in Redis for recovery / ops. */
  recordPlayerSocket(socketId: string, roomCode: string, playerId: string): void {
    this.persistSocket(socketId, roomCode, playerId);
  }

  async generateRoomCode(): Promise<string> {
    let code: string;
    let exists = true;
    let attempts = 0;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
      const localExists = this.rooms.has(code);
      const redisExists = this.redisStore?.isConnected
        ? await this.redisStore.roomExists(code)
        : false;
      exists = localExists || redisExists;
      attempts++;
    } while (exists && attempts < 100);
    return code;
  }

  async createRoom(hostSocketId: string): Promise<Room> {
    const code = await this.generateRoomCode();
    const hostPlayerId = uuidv4();
    const teamCount = defaultSettings.general.teamCount;
    const teamNames = ['Rockets', 'Ninjas', 'Cyberpunks', 'Champions', 'Kittens', 'Thunders', 'Stars', 'Titans'];
    const room: Room = {
      code,
      hostSocketId,
      hostPlayerId,
      gameState: GameState.LOBBY,
      settings: structuredClone(defaultSettings),
      players: [],
      teams: Array.from({ length: teamCount }, (_, i) => ({
        id: `team-${i}`,
        name: teamNames[i % teamNames.length] ?? `Team ${i + 1}`,
        score: 0,
        color: TEAM_COLORS[i % TEAM_COLORS.length].class,
        colorHex: TEAM_COLORS[i % TEAM_COLORS.length].hex,
        players: [],
        nextPlayerIndex: 0,
      })),
      currentTeamIndex: 0,
      wordDeck: [],
      currentWord: '',
      currentTask: null,
      currentRoundStats: { ...defaultRoundStats },
      timeLeft: 0,
      isPaused: false,
      timerInterval: null,
      socketToPlayer: new Map(),
      roundsPlayed: 0,
      createdAt: Date.now(),
      usedWords: [],
      imposterPlayerId: undefined,
      imposterWord: undefined,
      imposterPhase: undefined,
      revealedPlayerIds: [],
      teamsLocked: false,
    };
    this.rooms.set(code, room);
    this.persistRoom(room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  /**
   * Try to restore a room from Redis if it is not currently in memory.
   * Called during reconnects / joins after a server restart.
   * Returns the Room if found (from memory or Redis), otherwise null.
   */
  async restoreRoomFromRedis(code: string): Promise<Room | null> {
    if (this.rooms.has(code)) return this.rooms.get(code)!;
    if (!this.redisStore?.isConnected) return null;

    const [syncState, imposterWord] = await Promise.all([
      this.redisStore.getRoomState(code),
      this.redisStore.getImposterWord(code),
    ]);
    if (!syncState) return null;

    const hostPlayer = syncState.players.find((p) => p.isHost);
    const playersRestored = syncState.players.map((p) => ({ ...p, isConnected: false }));
    const teamsRestored = syncState.teams.map((team) => ({
      ...team,
      players: team.players.map((p) => ({ ...p, isConnected: false })),
    }));
    const room: Room = {
      code,
      hostSocketId: '', // unknown until host reconnects via room:rejoin
      hostPlayerId: hostPlayer?.id ?? '',
      gameState: syncState.gameState,
      settings: syncState.settings,
      players: playersRestored,
      teams: teamsRestored,
      currentTeamIndex: syncState.currentTeamIndex,
      wordDeck: syncState.wordDeck,
      currentWord: syncState.currentWord,
      currentTask: syncState.currentTask ?? null,
      currentRoundStats: syncState.currentRoundStats,
      timeLeft: syncState.timeLeft,
      isPaused: true, // always pause on restore — server timer was lost
      timerInterval: null,
      socketToPlayer: new Map(),
      roundsPlayed: 0,
      createdAt: Date.now(),
      usedWords: [], // can't restore from Redis; new deck will be built fresh
      // Restore IMPOSTER secret word — it was stored separately to keep it out of GameSyncState.
      // Without this, the RESULTS screen would show null after a server restart.
      imposterWord: imposterWord ?? undefined,
      imposterPhase: syncState.imposterPhase,
      imposterPlayerId: syncState.imposterPlayerId,
      revealedPlayerIds: syncState.revealedPlayerIds ?? [],
    };

    this.rooms.set(code, room);
    console.log(`[RoomManager] Restored room ${code} from Redis`);
    return room;
  }

  addPlayer(
    roomCode: string,
    socketId: string,
    name: string,
    avatar: string,
    avatarId?: string | null
  ): Player | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    if (room.players.length >= MAX_PLAYERS) return null;

    const playerId = uuidv4();
    const isHostSocket = socketId === room.hostSocketId;
    const player: Player = {
      id: playerId,
      name: name.replace(/<[^>]*>/g, '').slice(0, 20),
      avatar,
      ...(avatarId != null ? { avatarId } : {}),
      isHost: isHostSocket,
      isConnected: true,
      stats: { explained: 0, guessed: 0 },
    };

    // Sync room.hostPlayerId with the actual player UUID.
    // createRoom() sets a placeholder UUID; the real host UUID is only known after addPlayer.
    if (isHostSocket) {
      room.hostPlayerId = playerId;
    }

    room.players.push(player);
    room.socketToPlayer.set(socketId, playerId);
    this.persistRoom(room);
    this.persistSocket(socketId, roomCode, playerId);
    return player;
  }

  removePlayer(roomCode: string, socketId: string): string | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerId = room.socketToPlayer.get(socketId);
    if (!playerId) return null;

    const wasHost = room.hostPlayerId === playerId; // Перевіряємо чи був це хост

    room.players = room.players.filter((p) => p.id !== playerId);
    const keepEmptyTeams =
      room.gameState === GameState.LOBBY ||
      room.gameState === GameState.SETTINGS ||
      room.gameState === GameState.TEAMS;
    room.teams = room.teams
      .map((team) => {
        const newPlayers = team.players.filter((p) => p.id !== playerId);
        return {
          ...team,
          players: newPlayers,
          nextPlayerIndex:
            team.nextPlayerIndex >= newPlayers.length
              ? Math.max(0, newPlayers.length - 1)
              : team.nextPlayerIndex,
        };
      })
      .filter((team) => keepEmptyTeams || team.players.length > 0); // drop empty teams only during active game
    // Clamp currentTeamIndex in case a team was removed
    if (room.teams.length > 0 && room.currentTeamIndex >= room.teams.length) {
      room.currentTeamIndex = 0;
    }
    room.socketToPlayer.delete(socketId);

    // Очищення, якщо кімната порожня
    if (room.players.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      this.rooms.delete(roomCode);
      this.clearWriterMismatchThrottle(roomCode);
      if (this.redisStore?.isConnected) {
        this.redisStore.deleteRoom(roomCode).catch(() => {});
      }
      return playerId;
    }

    // Передача прав хоста, якщо кімната не порожня
    if (wasHost) {
      // Шукаємо першого, хто онлайн. Якщо всі офлайн — беремо будь-кого (кімната все одно скоро помре).
      const nextPlayer = room.players.find((p) => p.isConnected) || room.players[0];
      if (nextPlayer) {
        room.hostPlayerId = nextPlayer.id;
        room.hostSocketId = this.getPlayerSocketId(room, nextPlayer.id) ?? '';
        this.applyHostFlags(room, nextPlayer.id);
      }
    }

    this.persistRoom(room);
    if (this.redisStore?.isConnected) {
      this.redisStore.removeSocket(socketId).catch(() => {});
    }

    return playerId;
  }

  /**
   * Handle socket disconnect with host migration.
   * Returns { roomCode, removedPlayerId?, newHostSocketId?, wasMigration } — roomCode завжди, якщо кімната ще існує.
   *
   * Delegates all mutation (player removal, host migration, persist) to removePlayer(),
   * then reads back the result. This avoids a double-migration bug where both
   * removePlayer() and this method independently applied conflicting host reassignments.
   */
  handleDisconnect(socketId: string): {
    roomCode: string;
    removedPlayerId?: string;
    newHostSocketId?: string;
    wasMigration?: boolean;
  } | null {
    for (const [code, room] of this.rooms) {
      if (!room.socketToPlayer.has(socketId)) continue;

      const wasHost = socketId === room.hostSocketId;
      const removedPlayerId = this.removePlayer(code, socketId) ?? undefined;

      // removePlayer already handled timer cleanup + Redis delete if room became empty
      if (room.players.length === 0) {
        return null;
      }

      // removePlayer already migrated the host via applyHostFlags (prefers connected players).
      // Read the updated host socket from room state — no second migration needed.
      if (wasHost) {
        return {
          roomCode: code,
          removedPlayerId,
          newHostSocketId: room.hostSocketId || undefined,
          wasMigration: true,
        };
      }

      return { roomCode: code, removedPlayerId };
    }
    return null;
  }

  getPlayerSocketId(room: Room, playerId: string): string | undefined {
    for (const [socketId, pId] of room.socketToPlayer) {
      if (pId === playerId) return socketId;
    }
    return undefined;
  }

  /**
   * Socket dropped: remove socket mapping, mark player disconnected, migrate host if needed.
   * Player stays in room until grace timeout or rejoin.
   */
  markSocketDisconnected(socketId: string): {
    roomCode: string;
    playerId: string;
    wasHostMigration: boolean;
  } | null {
    for (const [code, room] of this.rooms) {
      const playerId = room.socketToPlayer.get(socketId);
      if (!playerId) continue;

      const wasHost = socketId === room.hostSocketId;
      room.socketToPlayer.delete(socketId);
      if (this.redisStore?.isConnected) {
        this.redisStore.removeSocket(socketId).catch(() => {});
      }
      this.setPlayerConnectionFlag(room, playerId, false);

      let wasHostMigration = false;
      if (wasHost) {
        // Host migration is now handled only in finalizeGraceRemoval
        room.hostSocketId = '';
        wasHostMigration = false;
      }

      this.persistRoom(room);
      return { roomCode: code, playerId, wasHostMigration };
    }
    return null;
  }

  /** After grace: remove player if they did not reconnect (no socket mapping). */
  finalizeGraceRemoval(
    roomCode: string,
    playerId: string
  ): {
    roomCode: string;
    removedPlayerId?: string;
    newHostSocketId?: string;
    wasMigration?: boolean;
  } | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    for (const [, pid] of room.socketToPlayer) {
      if (pid === playerId) return null;
    }
    if (!room.players.some((p) => p.id === playerId)) return null;

    const wasHost = room.hostPlayerId === playerId;

    room.players = room.players.filter((p) => p.id !== playerId);
    const keepEmptyTeams =
      room.gameState === GameState.LOBBY ||
      room.gameState === GameState.SETTINGS ||
      room.gameState === GameState.TEAMS;
    room.teams = room.teams
      .map((team) => {
        const newPlayers = team.players.filter((p) => p.id !== playerId);
        return {
          ...team,
          players: newPlayers,
          nextPlayerIndex:
            team.nextPlayerIndex >= newPlayers.length
              ? Math.max(0, newPlayers.length - 1)
              : team.nextPlayerIndex,
        };
      })
      .filter((team) => keepEmptyTeams || team.players.length > 0);
    if (room.teams.length > 0 && room.currentTeamIndex >= room.teams.length) {
      room.currentTeamIndex = 0;
    }

    if (room.players.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      this.rooms.delete(roomCode);
      this.clearWriterMismatchThrottle(roomCode);
      if (this.redisStore?.isConnected) {
        this.redisStore.deleteRoom(roomCode).catch(() => {});
      }
      return null;
    }

    if (wasHost) {
      const firstEntry = room.socketToPlayer.entries().next().value;
      if (firstEntry) {
        const [newHostSocketId, newHostPlayerId] = firstEntry;
        room.hostSocketId = newHostSocketId;
        room.hostPlayerId = newHostPlayerId;
        this.applyHostFlags(room, newHostPlayerId);
        this.persistRoom(room);
        return { roomCode, removedPlayerId: playerId, newHostSocketId, wasMigration: true };
      }
      // Шукаємо першого, хто онлайн. Якщо всі офлайн — беремо будь-кого (кімната все одно скоро помре).
      const newHostP = room.players.find((p) => p.isConnected) || room.players[0];
      room.hostPlayerId = newHostP.id;
      room.hostSocketId = this.getPlayerSocketId(room, newHostP.id) ?? '';
      this.applyHostFlags(room, newHostP.id);
      this.persistRoom(room);
      return { roomCode, removedPlayerId: playerId, wasMigration: true };
    }

    this.persistRoom(room);
    return { roomCode, removedPlayerId: playerId };
  }

  markPlayerReconnected(roomCode: string, playerId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    if (!room.players.some((p) => p.id === playerId)) return;
    this.setPlayerConnectionFlag(room, playerId, true);
    this.persistRoom(room);
  }

  /**
   * Authoritative rejoin: update socket map and host socket on this instance.
   * Caller must `socket.join`, set `socket.data`, and emit `room:rejoined`.
   */
  applyRejoinSocket(
    roomCode: string,
    playerId: string,
    newSocketId: string
  ): { playerName: string } | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;

    for (const [sid, pid] of room.socketToPlayer) {
      if (pid === playerId) room.socketToPlayer.delete(sid);
    }
    room.socketToPlayer.set(newSocketId, playerId);
    this.persistSocket(newSocketId, roomCode, playerId);

    if (room.hostPlayerId === playerId) {
      room.hostSocketId = newSocketId;
    }

    this.markPlayerReconnected(roomCode, playerId);
    return { playerName: player.name };
  }

  /** Drop all socket mappings for a player (kick / cleanup). Does not remove the player from lists. */
  detachSocketsForPlayer(room: Room, playerId: string): void {
    for (const [sid, pid] of [...room.socketToPlayer.entries()]) {
      if (pid !== playerId) continue;
      room.socketToPlayer.delete(sid);
      if (this.redisStore?.isConnected) {
        this.redisStore.removeSocket(sid).catch(() => {});
      }
    }
  }

  private setPlayerConnectionFlag(room: Room, playerId: string, connected: boolean): void {
    room.players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: connected } : p
    );
    room.teams = room.teams.map((team) => ({
      ...team,
      players: team.players.map((p) => (p.id === playerId ? { ...p, isConnected: connected } : p)),
    }));
  }

  private applyHostFlags(room: Room, hostPlayerId: string): void {
    room.players = room.players.map((p) => ({ ...p, isHost: p.id === hostPlayerId }));
    room.teams = room.teams.map((team) => ({
      ...team,
      players: team.players.map((p) => ({ ...p, isHost: p.id === hostPlayerId })),
    }));
  }

  getSyncState(room: Room): GameSyncState {
    return {
      gameState: room.gameState,
      settings: room.settings,
      roomCode: room.code,
      players: room.players,
      teams: room.teams,
      currentTeamIndex: room.currentTeamIndex,
      currentWord: room.currentTask?.prompt ?? room.currentWord,
      currentTask: room.currentTask,
      currentRoundStats: room.currentRoundStats,
      timeLeft: room.timeLeft,
      isPaused: room.isPaused,
      timeUp: room.timeUp,
      wordDeck: room.wordDeck,
      imposterPhase: room.imposterPhase,
      imposterPlayerId: room.imposterPlayerId,
      revealedPlayerIds: room.revealedPlayerIds ?? [],
      teamsLocked: room.teamsLocked ?? false,
    };
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room?.timerInterval) clearInterval(room.timerInterval);
    this.rooms.delete(code);
    this.clearWriterMismatchThrottle(code);
    if (this.redisStore?.isConnected) {
      this.redisStore.deleteRoom(code).catch(() => {});
    }
  }
}
