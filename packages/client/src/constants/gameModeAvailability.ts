import { GameMode } from '../types';

/** Requires multiple players on separate devices — not supported in pass-and-play offline. */
export const ONLINE_ONLY_GAME_MODES: ReadonlySet<GameMode> = new Set([GameMode.QUIZ]);

export function isOnlineOnlyGameMode(mode: GameMode | undefined): boolean {
  return mode != null && ONLINE_ONLY_GAME_MODES.has(mode);
}
