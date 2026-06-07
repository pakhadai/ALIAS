import { describe, it, expect } from 'vitest';
import {
  canSkipNamePrompt,
  isOAuthAuthProvider,
  resolvePlayerNameFromProfile,
} from './profilePlayerName';
import type { UserProfile } from '../services/api';

const baseProfile: UserProfile = {
  id: 'u1',
  email: 'player@gmail.com',
  authProvider: 'google',
  name: 'John Doe',
  avatarUrl: null,
  displayName: null,
  avatarId: null,
  skipNamePrompt: true,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  purchases: [],
  playerStats: { gamesPlayed: 0, wordsGuessed: 0, wordsSkipped: 0, lastPlayed: '' },
};

describe('profilePlayerName', () => {
  it('prefers displayName over OAuth name and email', () => {
    expect(
      resolvePlayerNameFromProfile({
        ...baseProfile,
        displayName: 'Custom',
        name: 'John',
        email: 'a@b.c',
      })
    ).toBe('Custom');
  });

  it('falls back to OAuth name then email local part', () => {
    expect(resolvePlayerNameFromProfile({ ...baseProfile, displayName: null })).toBe('John Doe');
    expect(resolvePlayerNameFromProfile({ ...baseProfile, displayName: null, name: null })).toBe(
      'player'
    );
  });

  it('canSkipNamePrompt requires authenticated OAuth user with flag and resolvable name', () => {
    expect(
      canSkipNamePrompt(
        {
          status: 'authenticated',
          userId: 'u1',
          email: 'a@b.c',
          provider: 'google',
          isAdmin: false,
          profile: baseProfile,
        },
        baseProfile
      )
    ).toBe(true);

    expect(
      canSkipNamePrompt(
        {
          status: 'authenticated',
          userId: 'u1',
          email: 'a@b.c',
          provider: 'google',
          isAdmin: false,
          profile: { ...baseProfile, skipNamePrompt: false },
        },
        { ...baseProfile, skipNamePrompt: false }
      )
    ).toBe(false);

    expect(
      canSkipNamePrompt({ status: 'anonymous', userId: 'u1', profile: baseProfile }, baseProfile)
    ).toBe(false);
  });

  it('isOAuthAuthProvider recognizes telegram and google only', () => {
    expect(isOAuthAuthProvider('telegram')).toBe(true);
    expect(isOAuthAuthProvider('google')).toBe(true);
    expect(isOAuthAuthProvider('anonymous')).toBe(false);
  });
});
