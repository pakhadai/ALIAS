import { describe, it, expect } from 'vitest';
import { Language } from '@movli/shared';
import { buildTeamShells } from './buildTeamShells';
import type { Team } from '../types';

const basePlayer = {
  id: 'p1',
  name: 'Alice',
  avatar: '🦊',
  isHost: true,
  stats: { explained: 0, guessed: 0 },
};

describe('buildTeamShells', () => {
  it('should create team shells when teams is empty and teamCount is 2', () => {
    const result = buildTeamShells({
      teams: [],
      teamCount: 2,
      teamMode: 'TEAMS',
      language: Language.UA,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('team-0');
    expect(result[1]?.id).toBe('team-1');
    expect(result[0]?.name).toBe('Ракети');
    expect(result[1]?.name).toBe('Ніндзя');
    expect(result[0]?.players).toEqual([]);
    expect(result[1]?.players).toEqual([]);
  });

  it('should pass through SOLO teams without padding shells', () => {
    const soloTeams: Team[] = [
      {
        id: 'solo-0',
        name: 'Alice',
        score: 3,
        color: 'TEAM_1',
        colorHex: '#111',
        players: [basePlayer],
        nextPlayerIndex: 0,
      },
    ];

    const result = buildTeamShells({
      teams: soloTeams,
      teamCount: 2,
      teamMode: 'SOLO',
      language: Language.EN,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('solo-0');
    expect(result[0]?.score).toBe(3);
    expect(result[0]?.players).toEqual([basePlayer]);
    expect(result[0]).not.toBe(soloTeams[0]);
  });

  it('should preserve players when padding team shells', () => {
    const partial: Team[] = [
      {
        id: 'team-0',
        name: 'Custom',
        score: 5,
        color: 'TEAM_1',
        colorHex: '#222',
        players: [basePlayer],
        nextPlayerIndex: 1,
      },
    ];

    const result = buildTeamShells({
      teams: partial,
      teamCount: 2,
      teamMode: 'TEAMS',
      language: Language.EN,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.players).toEqual([basePlayer]);
    expect(result[0]?.score).toBe(5);
    expect(result[0]?.nextPlayerIndex).toBe(1);
    expect(result[1]?.players).toEqual([]);
    expect(result[1]?.id).toBe('team-1');
  });
});
