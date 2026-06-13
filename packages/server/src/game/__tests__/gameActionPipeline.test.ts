import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState, GameMode, Language, Category, SoundPreset, AppTheme } from '@movli/shared';
import type { GameSettings } from '@movli/shared';
import { broadcastRoomState, executeGameActionPipeline } from '../gameActionPipeline';
import { GameEngine } from '../../services/GameEngine';
import { RoomManager } from '../../services/RoomManager';
import { WordService } from '../../services/WordService';

const defaultSettings: GameSettings = {
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
};

function createIoCapture() {
  const roomEmits: Array<{ room: string; event: string; payload: unknown }> = [];
  const socketEmits: Array<{ socketId: string; event: string; payload: unknown }> = [];
  const sockets = new Map<
    string,
    { leave: ReturnType<typeof vi.fn>; data: Record<string, unknown> }
  >();

  const io = {
    to(target: string) {
      return {
        emit(event: string, payload: unknown) {
          if (sockets.has(target)) {
            socketEmits.push({ socketId: target, event, payload });
          } else {
            roomEmits.push({ room: target, event, payload });
          }
        },
      };
    },
    sockets: {
      sockets,
    },
  };

  return { io, roomEmits, socketEmits, sockets };
}

describe('gameActionPipeline', () => {
  let roomManager: RoomManager;
  let gameEngine: GameEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    roomManager = new RoomManager();
    gameEngine = new GameEngine(roomManager, new WordService());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should broadcast game:state-sync to the room on broadcastRoomState', async () => {
    const room = await roomManager.createRoom('socket-host');
    const player = roomManager.addPlayer(room.code, 'socket-host', 'Host', '🎮')!;
    player.isHost = true;

    const { io, roomEmits } = createIoCapture();
    broadcastRoomState(io as never, room.code, roomManager);

    expect(roomEmits.some((e) => e.event === 'game:state-sync' && e.room === room.code)).toBe(true);
    const sync = roomEmits.find((e) => e.event === 'game:state-sync')?.payload as {
      roomCode?: string;
    };
    expect(sync?.roomCode).toBe(room.code);
  });

  it('should run handleAction and broadcast after executeGameActionPipeline', async () => {
    const room = await roomManager.createRoom('socket-host');
    const host = roomManager.addPlayer(room.code, 'socket-host', 'Host', '🎮')!;
    host.isHost = true;
    const guest = roomManager.addPlayer(room.code, 'socket-guest', 'Guest', '🎲')!;
    room.teams = [
      {
        id: 'team-0',
        name: 'Rockets',
        score: 0,
        color: 'team-red',
        colorHex: '#f00',
        players: [host],
        nextPlayerIndex: 0,
      },
      {
        id: 'team-1',
        name: 'Ninjas',
        score: 0,
        color: 'team-blue',
        colorHex: '#00f',
        players: [guest],
        nextPlayerIndex: 0,
      },
    ];

    const { io, roomEmits } = createIoCapture();
    await executeGameActionPipeline(
      io as never,
      roomManager,
      gameEngine,
      room,
      room.code,
      { action: 'START_GAME' },
      host.id
    );

    const live = roomManager.getRoom(room.code)!;
    expect(live.gameState).toBe(GameState.PRE_ROUND);
    expect(roomEmits.filter((e) => e.event === 'game:state-sync').length).toBeGreaterThan(0);
  });

  it('should emit player:kicked and detach socket on KICK_PLAYER', async () => {
    const room = await roomManager.createRoom('socket-host');
    const host = roomManager.addPlayer(room.code, 'socket-host', 'Host', '🎮')!;
    host.isHost = true;
    const guest = roomManager.addPlayer(room.code, 'socket-guest', 'Guest', '🎲')!;

    const guestSocket = {
      leave: vi.fn().mockResolvedValue(undefined),
      data: { roomCode: room.code, playerId: guest.id, playerName: guest.name },
    };
    const { io, roomEmits, sockets } = createIoCapture();
    sockets.set('socket-guest', guestSocket);

    await executeGameActionPipeline(
      io as never,
      roomManager,
      gameEngine,
      room,
      room.code,
      { action: 'KICK_PLAYER', data: guest.id },
      host.id
    );

    expect(roomEmits.some((e) => e.event === 'player:kicked' && e.room === room.code)).toBe(true);
    expect(guestSocket.leave).toHaveBeenCalledWith(room.code);
    expect(guestSocket.data.roomCode).toBeUndefined();
    expect(roomManager.getRoom(room.code)?.players.some((p) => p.id === guest.id)).toBe(false);
  });

  it('should emit imposter:secret per socket when IMPOSTER room is in reveal phase', async () => {
    const room = await roomManager.createRoom('s1');
    const p1 = roomManager.addPlayer(room.code, 's1', 'Ann', '🦊')!;
    roomManager.addPlayer(room.code, 's2', 'Bob', '🐻');
    room.settings = {
      general: defaultSettings.general,
      mode: { gameMode: GameMode.IMPOSTER, imposterDiscussionTime: 120 },
    };
    room.imposterPhase = 'REVEAL';
    room.imposterPlayerId = p1.id;
    room.imposterWord = 'Secret';

    const { io, socketEmits, sockets } = createIoCapture();
    sockets.set('s1', { leave: vi.fn(), data: {} });
    sockets.set('s2', { leave: vi.fn(), data: {} });
    broadcastRoomState(io as never, room.code, roomManager);

    const secrets = socketEmits.filter((e) => e.event === 'imposter:secret');
    expect(secrets).toHaveLength(2);
    expect(secrets.some((e) => (e.payload as { isImposter: boolean }).isImposter)).toBe(true);
    expect(secrets.some((e) => !(e.payload as { isImposter: boolean }).isImposter)).toBe(true);
  });
});
