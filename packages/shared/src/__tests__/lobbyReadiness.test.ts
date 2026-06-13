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

  it('should reject when playersCount is 0', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 0,
        teams: [],
        playerIds: [],
      })
    ).toEqual({ ok: false, reason: 'MIN_PLAYERS' });
  });

  it('should reject SOLO with a single player', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'SOLO',
        playersCount: 1,
        teams: [],
        playerIds: ['solo'],
      })
    ).toEqual({ ok: false, reason: 'MIN_PLAYERS' });
  });

  it('should accept SOLO with exactly 2 players regardless of team shells', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'SOLO',
        playersCount: 2,
        teams: [{ players: [] }, { players: [{ id: 'p1' }] }],
        playerIds: ['p1', 'p2'],
      })
    ).toEqual({ ok: true });
  });

  it('should accept SOLO even when players appear unassigned in team shells (teamsLocked path)', () => {
    // teamsLocked is enforced by authorizeGameAction; readiness only checks player count in SOLO.
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'SOLO',
        playersCount: 4,
        teams: [{ players: [{ id: 'p1' }] }],
        playerIds: ['p1', 'p2', 'p3', 'p4'],
      })
    ).toEqual({ ok: true });
  });

  it('should derive unassigned count from playersCount when playerIds omitted', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 3,
        teams: [{ players: [{ id: 'p1' }] }, { players: [] }],
      })
    ).toEqual({ ok: false, reason: 'UNASSIGNED' });
  });

  it('should accept TEAMS when all playerIds are assigned and every shell has a player', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 4,
        teams: [
          { players: [{ id: 'p1' }, { id: 'p2' }] },
          { players: [{ id: 'p3' }, { id: 'p4' }] },
        ],
        playerIds: ['p1', 'p2', 'p3', 'p4'],
      })
    ).toEqual({ ok: true });
  });

  it('should ignore malformed player entries when counting assignments', () => {
    expect(
      deriveLobbyReadinessServer({
        teamMode: 'TEAMS',
        playersCount: 2,
        teams: [{ players: [{ id: 'p1' }, null, { notId: 'x' }] }, { players: [{ id: 'p2' }] }],
        playerIds: ['p1', 'p2'],
      })
    ).toEqual({ ok: true });
  });
});
