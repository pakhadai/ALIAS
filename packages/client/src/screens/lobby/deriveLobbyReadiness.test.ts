import { describe, it, expect } from 'vitest';
import { deriveLobbyReadiness, hasOverfilledTeam } from './deriveLobbyReadiness';
import type { Player } from '../../types';

const labels = {
  lobbyStartMinPlayers: 'Need 2 players',
  lobbyStartUnassigned: 'Assign all',
  lobbyStartEmptyTeam: 'Empty team',
  lobbyReadinessMinPlayers: '≥2 players',
  lobbyReadinessAllAssigned: 'All in teams',
  lobbyReadinessEachTeam: 'Each team has a player',
};

const stubPlayer = (id: string): Player => ({
  id,
  name: id,
  avatar: '🦊',
  isHost: false,
  stats: { explained: 0, guessed: 0 },
});

describe('deriveLobbyReadiness', () => {
  it('should return first blocking reason for unassigned players in team mode', () => {
    const result = deriveLobbyReadiness({
      isHost: true,
      isSolo: false,
      playersCount: 3,
      unassignedCount: 1,
      teamShells: [{ players: [stubPlayer('a')] }, { players: [stubPlayer('b')] }],
      labels,
    });
    expect(result.ok).toBe(false);
    expect(result.firstBlockingReason).toBe('Assign all');
  });

  it('should skip team checks in solo mode when min players met', () => {
    const result = deriveLobbyReadiness({
      isHost: true,
      isSolo: true,
      playersCount: 2,
      unassignedCount: 2,
      teamShells: [],
      labels,
    });
    expect(result.ok).toBe(true);
    expect(result.items).toHaveLength(1);
  });

  it('should detect overfilled teams without blocking start', () => {
    const teamShells = [
      { players: [stubPlayer('a'), stubPlayer('b'), stubPlayer('c'), stubPlayer('d')] },
      { players: [] as Player[] },
    ];
    expect(hasOverfilledTeam(teamShells, 4)).toBe(true);
    const result = deriveLobbyReadiness({
      isHost: true,
      isSolo: false,
      playersCount: 4,
      unassignedCount: 0,
      teamShells,
      labels,
    });
    expect(result.ok).toBe(false);
    expect(result.firstBlockingReason).toBe('Empty team');
  });
});
