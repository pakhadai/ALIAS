import type { RoomErrorCode, RoomErrorPayload } from '@alias/shared';

export function roomError(code: RoomErrorCode, message: string): RoomErrorPayload {
  return { code, message };
}
