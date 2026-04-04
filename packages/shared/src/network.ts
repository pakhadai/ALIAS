/** Legacy / generic message envelope (prefer typed socket events in `events.ts` when possible). */
export type NetworkActionType =
  | 'JOIN_REQUEST'
  | 'SYNC_STATE'
  | 'GAME_ACTION'
  | 'KICK_PLAYER'
  | 'KICKED';

export interface NetworkMessage {
  type: NetworkActionType;
  payload: unknown;
}
