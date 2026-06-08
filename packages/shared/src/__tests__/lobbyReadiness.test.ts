import { describe, it, expect } from 'vitest';
import { deriveLobbyReadinessServer } from '../lobbyReadiness';

describe('deriveLobbyReadinessServer', () => {
  it('should reject when fewer than 2 players', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 1,
        teams: [{ players: [{ id: 'p1' }] }],
        playerIds: ['p1'],
      })
    ).toEqual({ ok: false, reason: 'MIN_PLAYERS' });
  });

  it('should reject TEAMS when players are unassigned', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 2,
        teams: [{ players: [{ id: 'p1' }] }, { players: [] }],
        playerIds: ['p1', 'p2'],
      })
    ).toEqual({ ok: false, reason: 'UNASSIGNED' });
  });

  it('should reject TEAMS when a team shell is empty', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 2,
        teams: [{ players: [{ id: 'p1' }, { id: 'p2' }] }, { players: [] }],
        playerIds: ['p1', 'p2'],
      })
    ).toEqual({ ok: false, reason: 'EMPTY_TEAM' });
  });

  it('should accept valid TEAMS lobby', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 2,
        teams: [{ players: [{ id: 'p1' }] }, { players: [{ id: 'p2' }] }],
        playerIds: ['p1', 'p2'],
      })
    ).toEqual({ ok: true });
  });

  it('should accept SOLO with 2+ players without team assignment', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'SOLO',
        playersCount: 3,
        teams: [],
        playerIds: ['p1', 'p2', 'p3'],
      })
    ).toEqual({ ok: true });
  });
});
