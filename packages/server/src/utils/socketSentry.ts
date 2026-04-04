import * as Sentry from '@sentry/node';
import type { Socket } from 'socket.io';

/** Wrap a Socket.io handler so async rejections and sync throws are reported to Sentry. */
export function onSocket(
  socket: Socket,
  event: string,
  handler: (...args: unknown[]) => void | Promise<void>
): void {
  socket.on(event as never, (...args: unknown[]) => {
    try {
      const out = handler(...args);
      if (out !== undefined && typeof (out as Promise<void>).then === 'function') {
        void (out as Promise<void>).catch((err: unknown) => {
          reportSocketError(err, event, socket.id);
        });
      }
    } catch (err) {
      reportSocketError(err, event, socket.id);
    }
  });
}

function reportSocketError(err: unknown, event: string, socketId: string): void {
  if (!Sentry.isInitialized()) {
    console.error(`[Socket ${event}]`, err);
    return;
  }
  const error = err instanceof Error ? err : new Error(String(err));
  Sentry.captureException(error, {
    tags: { socket_event: event },
    extra: { socketId },
  });
}
