import { describe, it, expect } from 'vitest';
import { GameState } from '../types';
import { shouldShowLoginModal } from './loginModalVisibility';

const base = {
  isTelegram: false,
  authStatus: 'anonymous' as const,
  gameState: GameState.MENU,
  dismissed: false,
  forced: false,
};

describe('shouldShowLoginModal', () => {
  it('should show auto prompt on menu for anonymous guest', () => {
    expect(shouldShowLoginModal(base)).toBe(true);
  });

  it('should hide auto prompt when guest dismissed login on menu', () => {
    expect(shouldShowLoginModal({ ...base, dismissed: true })).toBe(false);
  });

  it('should show forced login on profile even when dismissed', () => {
    expect(
      shouldShowLoginModal({
        ...base,
        gameState: GameState.PROFILE,
        dismissed: true,
        forced: true,
      })
    ).toBe(true);
  });

  it('should show forced login on player stats', () => {
    expect(
      shouldShowLoginModal({
        ...base,
        gameState: GameState.PLAYER_STATS,
        forced: true,
      })
    ).toBe(true);
  });

  it('should not show login in telegram mini app', () => {
    expect(shouldShowLoginModal({ ...base, isTelegram: true, forced: true })).toBe(false);
  });

  it('should not show login for authenticated users', () => {
    expect(shouldShowLoginModal({ ...base, authStatus: 'authenticated', forced: true })).toBe(
      false
    );
  });
});
