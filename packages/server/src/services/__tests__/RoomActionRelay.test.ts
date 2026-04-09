import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { RoomActionRelay } from '../RoomActionRelay';

function makeSocket() {
  return {
    connected: true,
    data: {} as Record<string, unknown>,
    emit: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RoomActionRelay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('registerPending emits RELAY_TIMEOUT if no reply', async () => {
    const relay = new RoomActionRelay();
    const socket = makeSocket();
    relay.registerPending('req-1', socket as never);

    await vi.advanceTimersByTimeAsync(8000);
    expect(socket.emit).toHaveBeenCalledWith(
      'room:error',
      expect.objectContaining({ code: 'RELAY_TIMEOUT' })
    );
  });

  test('dispatchReply cancels timer and emits room:joined for roomJoinOk', () => {
    const relay = new RoomActionRelay();
    const socket = makeSocket();
    relay.registerPending('req-join', socket as never);

    relay.dispatchReply({
      v: 1,
      kind: 'reply',
      requestId: 'req-join',
      roomJoinOk: {
        roomCode: '12345',
        player: {
          id: 'p1',
          name: 'N',
          avatar: 'A',
          isHost: false,
          stats: { explained: 0, guessed: 0 },
        },
      },
    });

    expect(socket.join).toHaveBeenCalledWith('12345');
    expect(socket.data).toMatchObject({ roomCode: '12345', playerId: 'p1', playerName: 'N' });
    expect(socket.emit).toHaveBeenCalledWith('room:joined', { roomCode: '12345', playerId: 'p1' });
  });

  test('dispatchReply clears socket room data on roomLeaveOk', () => {
    const relay = new RoomActionRelay();
    const socket = makeSocket();
    socket.data = { roomCode: '12345', playerId: 'p1', playerName: 'N' };
    relay.registerPending('req-leave', socket as never);

    relay.dispatchReply({
      v: 1,
      kind: 'reply',
      requestId: 'req-leave',
      roomLeaveOk: { roomCode: '12345' },
    });

    expect(socket.leave).toHaveBeenCalledWith('12345');
    expect(socket.data.roomCode).toBeUndefined();
    expect(socket.data.playerId).toBeUndefined();
    expect(socket.data.playerName).toBeUndefined();
  });

  test('dispatchReply joins and emits room:rejoined on roomRejoinOk', () => {
    const relay = new RoomActionRelay();
    const socket = makeSocket();
    relay.registerPending('req-rejoin', socket as never);

    relay.dispatchReply({
      v: 1,
      kind: 'reply',
      requestId: 'req-rejoin',
      roomRejoinOk: { roomCode: '12345', playerId: 'p2', playerName: 'X' },
    });

    expect(socket.join).toHaveBeenCalledWith('12345');
    expect(socket.emit).toHaveBeenCalledWith('room:rejoined', {
      roomCode: '12345',
      playerId: 'p2',
    });
    expect(socket.data).toMatchObject({ roomCode: '12345', playerId: 'p2', playerName: 'X' });
  });

  test('cancelPending prevents a timeout emit', async () => {
    const relay = new RoomActionRelay();
    const socket = makeSocket();
    relay.registerPending('req-cancel', socket as never);
    relay.cancelPending('req-cancel');

    await vi.advanceTimersByTimeAsync(8000);
    expect(socket.emit).not.toHaveBeenCalled();
  });

  test('dispatchReply emits room:error when reply has error', () => {
    const relay = new RoomActionRelay();
    const socket = makeSocket();
    relay.registerPending('req-e', socket as never);

    relay.dispatchReply({
      v: 1,
      kind: 'reply',
      requestId: 'req-e',
      error: { code: 'ROOM_NOT_FOUND', message: 'nope' },
    });

    expect(socket.emit).toHaveBeenCalledWith('room:error', {
      code: 'ROOM_NOT_FOUND',
      message: 'nope',
    });
  });

  test('publish* returns false when pub is not ready', async () => {
    const relay = new RoomActionRelay();
    (relay as unknown as { pub: { status: string } }).pub = { status: 'connecting' };
    const ok = await relay.publishRoomJoin('inst', {
      roomCode: '12345',
      requestingSocketId: 's1',
      playerName: 'n',
      avatar: 'a',
      replyToInstanceId: 'me',
      requestId: 'r1',
    });
    expect(ok).toBe(false);
  });

  test('publish* calls pub.publish and returns true when ready', async () => {
    const relay = new RoomActionRelay();
    const publish = vi.fn().mockResolvedValue(1);
    (relay as unknown as { pub: { status: string; publish: typeof publish } }).pub = {
      status: 'ready',
      publish,
    };

    const ok = await relay.publishRoomLeave('inst-2', {
      roomCode: '12345',
      socketId: 's1',
      replyToInstanceId: 'me',
      requestId: 'r2',
    });

    expect(ok).toBe(true);
    expect(publish).toHaveBeenCalledWith(
      expect.stringContaining('alias:rpc:to:inst-2'),
      expect.any(String)
    );
  });
});
