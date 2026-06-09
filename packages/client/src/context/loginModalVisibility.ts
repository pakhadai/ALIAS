import { GameState } from '../types';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'error';

/** When `forced`, login may open from any screen; auto-prompt stays menu-only. */
export function shouldShowLoginModal(params: {
  isTelegram: boolean;
  authStatus: AuthStatus;
  gameState: GameState;
  dismissed: boolean;
  forced: boolean;
}): boolean {
  const { isTelegram, authStatus, gameState, dismissed, forced } = params;
  if (isTelegram || authStatus !== 'anonymous') return false;
  if (forced) return true;
  return gameState === GameState.MENU && !dismissed;
}
