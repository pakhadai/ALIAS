import type { RoomErrorCode, RoomErrorPayload } from '@movli/shared';

export function roomError(code: RoomErrorCode, message: string): RoomErrorPayload {
  return { code, message };
}
