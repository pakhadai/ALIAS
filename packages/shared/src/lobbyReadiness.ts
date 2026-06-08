export type LobbyReadinessReason = 'MIN_PLAYERS' | 'UNASSIGNED' | 'EMPTY_TEAM';

export type LobbyReadinessResult = {
  ok: boolean;
  reason?: LobbyReadinessReason;
};

function countUnassigned(
  playerIds: string[] | undefined,
  playersCount: number,
  teams: { players: unknown[] }[]
): number {
  const assigned = new Set<string>();
  for (const team of teams) {
    for (const player of team.players) {
      if (
        player &&
        typeof player === 'object' &&
        'id' in player &&
        typeof (player as { id: unknown }).id === 'string'
      ) {
        assigned.add((player as { id: string }).id);
      }
    }
  }
  if (playerIds) {
    return playerIds.filter((id) => !assigned.has(id)).length;
  }
  return Math.max(0, playersCount - assigned.size);
}

/** Server-side lobby readiness — mirrors client deriveLobbyReadiness core rules (no i18n). */
export function deriveLobbyReadinessServer(params: {
  teamMode: 'TEAMS' | 'SOLO';
  playersCount: number;
  teams: { players: unknown[] }[];
  playerIds?: string[];
}): LobbyReadinessResult {
  const { teamMode, playersCount, teams, playerIds } = params;

  if (playersCount < 2) {
    return { ok: false, reason: 'MIN_PLAYERS' };
  }

  if (teamMode === 'SOLO') {
    return { ok: true };
  }

  const unassigned = countUnassigned(playerIds, playersCount, teams);
  if (unassigned > 0) {
    return { ok: false, reason: 'UNASSIGNED' };
  }

  if (teams.some((team) => team.players.length === 0)) {
    return { ok: false, reason: 'EMPTY_TEAM' };
  }

  return { ok: true };
}
