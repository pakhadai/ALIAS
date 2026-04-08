import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wireGraceAfterMarkDisconnected } from '../disconnectFlow';
import { RoomManager } from '../../services/RoomManager';
import { PerRoomQueue } from '../../services/PerRoomQueue';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '@alias/shared';

type IO = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function createIoMock() {
  const emits: Array<{ room: string; event: string; payload: unknown }> = [];
  const io = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emits.push({ room, event, payload });
        },
      };
    },
  } as unknown as IO;
  return { io, emits };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('disconnectFlow grace removal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes disconnected player after grace timeout and emits state sync', async () => {
    const rm = new RoomManager();
    const q = new PerRoomQueue();
    const { io, emits } = createIoMock();

    const room = await rm.createRoom('s-host');
    const host = rm.addPlayer(room.code, 's-host', 'Host', '🎮')!;
    const guest = rm.addPlayer(room.code, 's-guest', 'Guest', '🎲')!;

    expect(room.players).toHaveLength(2);

    const grace = rm.markSocketDisconnected('s-guest');
    expect(grace).not.toBeNull();
    expect(grace!.playerId).toBe(guest.id);

    wireGraceAfterMarkDisconnected(io, rm, q, grace!, 1000);

    // immediate sync on mark disconnected
    expect(emits.some((e) => e.event === 'game:state-sync' && e.room === room.code)).toBe(true);

    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    // after grace, guest removed
    const after = rm.getRoom(room.code)!;
    expect(after.players.some((p) => p.id === guest.id)).toBe(false);
    expect(after.players.some((p) => p.id === host.id)).toBe(true);

    // should announce player-left to room
    expect(emits.some((e) => e.event === 'room:player-left' && e.room === room.code)).toBe(true);
  });
});
