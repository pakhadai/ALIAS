import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ROOM_CODE_KEY, PLAYER_ID_KEY } from '../services/api';

type Handler = (...args: unknown[]) => void;
type EmitFn = ReturnType<typeof vi.fn>;

function createFakeSocket() {
  const handlers = new Map<string, Handler[]>();
  const onceHandlers = new Map<string, Handler[]>();
  const socket = {
    connected: false,
    auth: {} as Record<string, unknown>,
    on: (event: string, cb: Handler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), cb]);
      return socket;
    },
    once: (event: string, cb: Handler) => {
      onceHandlers.set(event, [...(onceHandlers.get(event) ?? []), cb]);
      return socket;
    },
    off: (event: string, cb: Handler) => {
      handlers.set(
        event,
        (handlers.get(event) ?? []).filter((x) => x !== cb)
      );
      return socket;
    },
    emit: vi.fn() as EmitFn,
    connect: vi.fn(() => {
      socket.connected = true;
      const hs = handlers.get('connect') ?? [];
      hs.forEach((h) => h());
      const os = onceHandlers.get('connect') ?? [];
      onceHandlers.delete('connect');
      os.forEach((h) => h());
    }),
    disconnect: vi.fn(() => {
      socket.connected = false;
      (handlers.get('disconnect') ?? []).forEach((h) => h());
    }),
    removeAllListeners: vi.fn(() => {
      handlers.clear();
      onceHandlers.clear();
    }),
    trigger: (event: string, ...args: unknown[]) => {
      (handlers.get(event) ?? []).forEach((h) => h(...args));
    },
  };
  return socket;
}

const fakeSocket = createFakeSocket();

vi.mock('socket.io-client', () => {
  return {
    io: vi.fn(() => fakeSocket),
  };
});

describe('useSocketConnection', () => {
  beforeEach(() => {
    localStorage.clear();
    fakeSocket.emit.mockClear();
    fakeSocket.removeAllListeners();
    fakeSocket.connected = false;
  });

  test('on connect: corrupted localStorage values are cleared and no rejoin is emitted', async () => {
    localStorage.setItem(ROOM_CODE_KEY, 'bad');
    localStorage.setItem(PLAYER_ID_KEY, 'also-bad');

    const { useSocketConnection } = await import('./useSocketConnection');
    renderHook(() =>
      useSocketConnection({
        onStateSync: vi.fn(),
        onPlayerJoined: vi.fn(),
        onPlayerLeft: vi.fn(),
        onKicked: vi.fn(),
        onError: vi.fn(),
        onNotification: vi.fn(),
      })
    );

    act(() => {
      fakeSocket.trigger('connect');
    });

    expect(localStorage.getItem(ROOM_CODE_KEY)).toBeNull();
    expect(localStorage.getItem(PLAYER_ID_KEY)).toBeNull();
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('room:rejoin', expect.anything());
  });

  test('on connect: valid localStorage triggers room:rejoin emit', async () => {
    localStorage.setItem(ROOM_CODE_KEY, '12345');
    // Must match UUID variant (8|9|a|b) at the start of the 4th group.
    localStorage.setItem(PLAYER_ID_KEY, '11111111-1111-1111-8111-111111111111');

    const { useSocketConnection } = await import('./useSocketConnection');
    renderHook(() =>
      useSocketConnection({
        onStateSync: vi.fn(),
        onPlayerJoined: vi.fn(),
        onPlayerLeft: vi.fn(),
        onKicked: vi.fn(),
        onError: vi.fn(),
        onNotification: vi.fn(),
      })
    );

    act(() => {
      fakeSocket.trigger('connect');
    });

    expect(fakeSocket.emit).toHaveBeenCalledWith('room:rejoin', {
      roomCode: '12345',
      playerId: '11111111-1111-1111-8111-111111111111',
    });
  });

  test('checkRoomExists: connects without emitting stored room:rejoin (prevents deep link hijack)', async () => {
    localStorage.setItem(ROOM_CODE_KEY, '11111');
    localStorage.setItem(PLAYER_ID_KEY, '11111111-1111-1111-8111-111111111111');

    fakeSocket.emit.mockImplementation((event: unknown, _payload: unknown, ack?: unknown) => {
      if (event === 'room:exists' && typeof ack === 'function') {
        (ack as (res: { exists: boolean }) => void)({ exists: true });
      }
    });

    const { useSocketConnection } = await import('./useSocketConnection');
    const { result } = renderHook(() =>
      useSocketConnection({
        onStateSync: vi.fn(),
        onPlayerJoined: vi.fn(),
        onPlayerLeft: vi.fn(),
        onKicked: vi.fn(),
        onError: vi.fn(),
        onNotification: vi.fn(),
      })
    );

    let exists = false;
    await act(async () => {
      exists = await result.current.checkRoomExists('22222');
    });

    expect(exists).toBe(true);
    expect(fakeSocket.connect).toHaveBeenCalled();
    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'room:exists',
      { roomCode: '22222' },
      expect.any(Function)
    );
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('room:rejoin', expect.anything());
  });
});
