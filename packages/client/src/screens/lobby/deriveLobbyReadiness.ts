import type { Team } from '../../types';

export type ReadinessItemId = 'minPlayers' | 'allAssigned' | 'eachTeamHasPlayer';

export type ReadinessItem = {
  id: ReadinessItemId;
  label: string;
  ok: boolean;
  blockingReason: string;
};

export type LobbyReadinessLabels = {
  lobbyStartMinPlayers: string;
  lobbyStartUnassigned: string;
  lobbyStartEmptyTeam: string;
  lobbyReadinessMinPlayers: string;
  lobbyReadinessAllAssigned: string;
  lobbyReadinessEachTeam: string;
};

export type LobbyReadiness = {
  ok: boolean;
  items: ReadinessItem[];
  firstBlockingReason: string;
  hasOverfilledTeams: boolean;
};

/** Warn-only: overfilled teams do not block `ok` — host may still start (see LOBBY_TEAM_BUILDER.md). */
export function hasOverfilledTeam(
  teamShells: Pick<Team, 'players'>[],
  playersTotal: number
): boolean {
  if (teamShells.length === 0 || playersTotal === 0) return false;
  const cap = Math.ceil(playersTotal / teamShells.length) + 1;
  return teamShells.some((team) => team.players.length > cap);
}

export function deriveLobbyReadiness(params: {
  isHost: boolean;
  isSolo: boolean;
  playersCount: number;
  unassignedCount: number;
  teamShells: Pick<Team, 'players'>[];
  labels: LobbyReadinessLabels;
}): LobbyReadiness {
  const { isHost, isSolo, playersCount, unassignedCount, teamShells, labels } = params;

  if (!isHost) {
    return { ok: false, items: [], firstBlockingReason: '', hasOverfilledTeams: false };
  }

  const minPlayersOk = playersCount >= 2;
  const allAssignedOk = isSolo || unassignedCount === 0;
  const eachTeamOk = isSolo || !teamShells.some((team) => team.players.length === 0);

  const items: ReadinessItem[] = [
    {
      id: 'minPlayers',
      label: labels.lobbyReadinessMinPlayers,
      ok: minPlayersOk,
      blockingReason: minPlayersOk ? '' : labels.lobbyStartMinPlayers,
    },
  ];

  if (!isSolo) {
    items.push(
      {
        id: 'allAssigned',
        label: labels.lobbyReadinessAllAssigned,
        ok: allAssignedOk,
        blockingReason: allAssignedOk ? '' : labels.lobbyStartUnassigned,
      },
      {
        id: 'eachTeamHasPlayer',
        label: labels.lobbyReadinessEachTeam,
        ok: eachTeamOk,
        blockingReason: eachTeamOk ? '' : labels.lobbyStartEmptyTeam,
      }
    );
  }

  const firstBlocking = items.find((item) => !item.ok);
  const ok = !firstBlocking;

  return {
    ok,
    items,
    firstBlockingReason: firstBlocking?.blockingReason ?? '',
    hasOverfilledTeams: hasOverfilledTeam(teamShells, playersCount),
  };
}
