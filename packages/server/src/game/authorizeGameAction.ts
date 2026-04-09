import type { GameActionPayload, RoomErrorPayload } from '@alias/shared';
import type { Room } from '../services/RoomManager';
import { roomError } from '../utils/roomError';

export type GameActionAuthContext =
  | { mode: 'socket'; socketId: string }
  | { mode: 'relay'; playerId: string };

export type GameActionAuthResult =
  | { ok: true; actorPlayerId: string }
  | { ok: false; error: RoomErrorPayload };

/**
 * Host / explainer checks for `game:action` — shared between local socket handling and cross-instance relay.
 */
export function authorizeGameAction(
  room: Room,
  payload: GameActionPayload,
  ctx: GameActionAuthContext
): GameActionAuthResult {
  // IMPOSTER: ready/end are allowed for any player in the room.
  if (payload.action === 'IMPOSTER_READY' || payload.action === 'IMPOSTER_END_GAME') {
    if (ctx.mode === 'socket') {
      const pid = room.socketToPlayer.get(ctx.socketId);
      if (!pid) return { ok: false, error: roomError('PLAYER_NOT_IN_ROOM', 'Not in this room') };
      return { ok: true, actorPlayerId: pid };
    }
    if (!room.players.some((p) => p.id === ctx.playerId)) {
      return { ok: false, error: roomError('PLAYER_NOT_IN_ROOM', 'Player not found in room') };
    }
    return { ok: true, actorPlayerId: ctx.playerId };
  }

  let actorPlayerId: string;
  let isHost: boolean;

  if (ctx.mode === 'socket') {
    const socketPlayerId = room.socketToPlayer.get(ctx.socketId);
    if (!socketPlayerId) {
      return { ok: false, error: roomError('PLAYER_NOT_IN_ROOM', 'Not in this room') };
    }
    actorPlayerId = socketPlayerId;
    isHost =
      ctx.socketId === room.hostSocketId ||
      (!!socketPlayerId && socketPlayerId === room.hostPlayerId);
    if (isHost && ctx.socketId !== room.hostSocketId) {
      room.hostSocketId = ctx.socketId;
    }
  } else {
    if (!room.players.some((p) => p.id === ctx.playerId)) {
      return { ok: false, error: roomError('PLAYER_NOT_IN_ROOM', 'Player not found in room') };
    }
    actorPlayerId = ctx.playerId;
    isHost = ctx.playerId === room.hostPlayerId;
  }

  const hostOnlyActions = new Set([
    'START_GAME',
    'START_DUEL',
    'GENERATE_TEAMS',
    'TEAM_SHUFFLE_UNASSIGNED',
    'TEAM_SHUFFLE_ALL',
    'TEAM_LOCK',
    'TEAM_RENAME',
    'NEXT_ROUND',
    'CONFIRM_ROUND',
    'RESET_GAME',
    'REMATCH',
    'UPDATE_SETTINGS',
    'KICK_PLAYER',
  ]);
  if (hostOnlyActions.has(payload.action) && !isHost) {
    return { ok: false, error: roomError('NOT_HOST', 'Only the host can perform this action') };
  }

  // Team builder: if locked, non-hosts cannot join/leave.
  if (
    (payload.action === 'TEAM_JOIN' || payload.action === 'TEAM_LEAVE') &&
    room.teamsLocked &&
    !isHost
  ) {
    return { ok: false, error: roomError('INVALID_ACTION', 'Teams are locked') };
  }

  // TEAM_JOIN with explicit playerId is host-only (assignment).
  if (payload.action === 'TEAM_JOIN') {
    const hasPlayerId =
      'data' in payload &&
      (payload.data as unknown as { playerId?: unknown } | undefined)?.playerId !== undefined;
    if (hasPlayerId && !isHost) {
      return { ok: false, error: roomError('NOT_HOST', 'Only the host can assign players') };
    }
  }
  // TEAM_LEAVE with explicit playerId is host-only (unassign).
  if (payload.action === 'TEAM_LEAVE') {
    const hasPlayerId =
      'data' in payload &&
      (payload.data as unknown as { playerId?: unknown } | undefined)?.playerId !== undefined;
    if (hasPlayerId && !isHost) {
      return { ok: false, error: roomError('NOT_HOST', 'Only the host can unassign players') };
    }
  }

  const explainerActions = new Set(['START_ROUND', 'START_PLAYING', 'CORRECT', 'SKIP', 'TIME_UP']);
  if (explainerActions.has(payload.action) && !isHost) {
    const upcomingExplainerId = (() => {
      const team = room.teams[room.currentTeamIndex];
      if (!team || team.players.length === 0) return null;
      return team.players[Math.min(team.nextPlayerIndex, team.players.length - 1)]?.id ?? null;
    })();
    const expectedId =
      payload.action === 'START_ROUND'
        ? upcomingExplainerId
        : room.currentRoundStats.explainerId || upcomingExplainerId;
    if (!actorPlayerId || actorPlayerId !== expectedId) {
      return {
        ok: false,
        error: roomError('NOT_EXPLAINER', 'Only the current explainer can perform this action'),
      };
    }
  }

  return { ok: true, actorPlayerId };
}
