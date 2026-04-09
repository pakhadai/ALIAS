import type { GameMode } from './enums';
import type { GeneralSettings } from './models';

/** Partial settings patch sent with `UPDATE_SETTINGS`. */
export type ModeSettingsUpdate = Partial<{
  gameMode: GameMode;
  classicRoundTime: number;
  imposterDiscussionTime: number;
}>;

export type GameSettingsUpdate = Partial<{
  general: Partial<GeneralSettings>;
  mode: ModeSettingsUpdate;
}>;

export type GameActionType =
  | 'CORRECT'
  | 'SKIP'
  | 'START_GAME'
  | 'START_DUEL'
  | 'START_ROUND'
  | 'START_PLAYING'
  | 'NEXT_ROUND'
  | 'RESET_GAME'
  | 'REMATCH'
  | 'UPDATE_SETTINGS'
  | 'GENERATE_TEAMS'
  | 'TEAM_JOIN'
  | 'TEAM_LEAVE'
  | 'TEAM_SHUFFLE_UNASSIGNED'
  | 'TEAM_SHUFFLE_ALL'
  | 'TEAM_LOCK'
  | 'TEAM_RENAME'
  | 'PAUSE_GAME'
  | 'KICK_PLAYER'
  | 'TIME_UP'
  | 'CONFIRM_ROUND'
  | 'ADD_OFFLINE_PLAYER'
  | 'REMOVE_OFFLINE_PLAYER'
  | 'GUESS_OPTION'
  | 'IMPOSTER_READY'
  | 'IMPOSTER_END_GAME';

type NoDataAction =
  | 'CORRECT'
  | 'SKIP'
  | 'START_GAME'
  | 'START_DUEL'
  | 'START_ROUND'
  | 'START_PLAYING'
  | 'NEXT_ROUND'
  | 'RESET_GAME'
  | 'REMATCH'
  | 'GENERATE_TEAMS'
  | 'TEAM_SHUFFLE_UNASSIGNED'
  | 'TEAM_SHUFFLE_ALL'
  | 'PAUSE_GAME'
  | 'TIME_UP'
  | 'CONFIRM_ROUND'
  | 'IMPOSTER_READY'
  | 'IMPOSTER_END_GAME';

type GameActionPayloadNoData = { [A in NoDataAction]: { action: A } }[NoDataAction];

/**
 * Discriminated union: `data` is only present where the action requires it.
 * Server validates wire payloads in `validateGameAction`; client offline may send richer shapes for local-only actions.
 */
export type GameActionPayload =
  | GameActionPayloadNoData
  | { action: 'UPDATE_SETTINGS'; data: GameSettingsUpdate }
  | { action: 'KICK_PLAYER'; data: string }
  /** Join a team. If `playerId` is provided, only host may assign that player. */
  | { action: 'TEAM_JOIN'; data: { teamId: string; playerId?: string } }
  /** Leave all teams. If `playerId` is provided, only host may unassign that player. */
  | { action: 'TEAM_LEAVE'; data?: { playerId?: string } }
  | { action: 'TEAM_LOCK'; data: { locked: boolean } }
  | { action: 'TEAM_RENAME'; data: { teamId: string; name: string } }
  | { action: 'GUESS_OPTION'; data: { selectedOption: string } }
  | { action: 'IMPOSTER_READY' }
  | { action: 'IMPOSTER_END_GAME' }
  | { action: 'ADD_OFFLINE_PLAYER'; data?: { name?: string; avatar?: string } }
  | { action: 'REMOVE_OFFLINE_PLAYER'; data: string };
