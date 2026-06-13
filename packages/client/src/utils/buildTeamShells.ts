import { getTeamColor, getTeamColorToken, Language } from '@movli/shared';
import type { Team } from '../types';
import { TEAM_NAMES } from '../constants';

const DEFAULT_MAX_TEAMS = 10;

export function buildTeamShells(params: {
  teams: Team[];
  teamCount: number;
  teamMode: 'TEAMS' | 'SOLO';
  language: Language;
  maxTeams?: number;
}): Team[] {
  const { teams, teamCount, teamMode, language, maxTeams = DEFAULT_MAX_TEAMS } = params;

  if (teamMode === 'SOLO') {
    return teams.map((t) => ({ ...t, players: [...t.players] }));
  }

  const desiredCount = Math.max(2, Math.min(teamCount, maxTeams));
  if (teams.length === desiredCount) {
    return teams.map((t) => ({ ...t, players: [...t.players] }));
  }

  const names = TEAM_NAMES[language] ?? TEAM_NAMES[Language.EN];
  return Array.from({ length: desiredCount }, (_, i) => {
    const existing = teams[i];
    return {
      id: `team-${i}`,
      name: names[i % names.length] ?? `Team ${i + 1}`,
      score: existing?.score ?? 0,
      color: existing?.color ?? getTeamColorToken(i),
      colorHex: existing?.colorHex ?? getTeamColor(i).hex,
      players: existing?.players ? [...existing.players] : [],
      nextPlayerIndex: existing?.nextPlayerIndex ?? 0,
    };
  });
}
