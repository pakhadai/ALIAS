import type { RoomErrorPayload } from '@alias/shared';

/** Thrown by GameEngine when an action must abort without mutating room state. */
export class GameActionRejectedError extends Error {
  readonly payload: RoomErrorPayload;

  constructor(payload: RoomErrorPayload) {
    super(payload.message);
    this.name = 'GameActionRejectedError';
    this.payload = payload;
  }
}
