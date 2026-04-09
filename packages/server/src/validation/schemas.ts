import { z } from 'zod';
import { Language, Category, SoundPreset, AppTheme, GameMode } from '@alias/shared';
import type { GameActionPayload, GameSettingsUpdate } from '@alias/shared';

// --- Socket event payloads ---

/** Fullwidth digits (common on mobile IME) → ASCII 0–9. */
function normalizeAsciiDigits(s: string): string {
  return s.replace(/[\uFF10-\uFF19]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30)
  );
}

function preprocessRoomCode(v: unknown): unknown {
  if (v == null) return v;
  return normalizeAsciiDigits(String(v).trim());
}

function preprocessPlayerName(v: unknown): unknown {
  if (v == null) return v;
  return String(v)
    .replace(/<[^>]*>/g, '')
    .trim();
}

function preprocessAvatar(v: unknown): unknown {
  if (v == null) return v;
  return String(v).trim();
}

function preprocessAvatarId(v: unknown): unknown {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim().slice(0, 3);
  return s === '' ? undefined : s;
}

export const roomCreateSchema = z.object({
  playerName: z.preprocess(preprocessPlayerName, z.string().min(1).max(20)),
  avatar: z.preprocess(preprocessAvatar, z.string().min(1).max(12)),
  avatarId: z.preprocess(preprocessAvatarId, z.union([z.string().max(3), z.null()]).optional()),
});

export const roomJoinSchema = z.object({
  roomCode: z.preprocess(
    preprocessRoomCode,
    z.string().regex(/^\d{5}$/, 'Room code must be 5 digits')
  ),
  playerName: z.preprocess(preprocessPlayerName, z.string().min(1).max(20)),
  avatar: z.preprocess(preprocessAvatar, z.string().min(1).max(12)),
  avatarId: z.preprocess(preprocessAvatarId, z.union([z.string().max(3), z.null()]).optional()),
});

export const roomRejoinSchema = z.object({
  roomCode: z.preprocess(
    preprocessRoomCode,
    z.string().regex(/^\d{5}$/, 'Room code must be 5 digits')
  ),
  playerId: z.string().uuid(),
});

export const roomExistsSchema = z.object({
  roomCode: z.preprocess(
    preprocessRoomCode,
    z.string().regex(/^\d{5}$/, 'Room code must be 5 digits')
  ),
});

// --- Game settings validation ---

const generalSettingsPartialSchema = z
  .object({
    language: z.nativeEnum(Language),
    scoreToWin: z.number().int().min(5).max(100),
    skipPenalty: z.boolean(),
    categories: z.array(z.nativeEnum(Category)).min(1).max(10),
    soundEnabled: z.boolean(),
    soundPreset: z.nativeEnum(SoundPreset),
    teamMode: z.enum(['TEAMS', 'SOLO']),
    teamCount: z.number().int().min(2).max(8),
    theme: z.nativeEnum(AppTheme),
    customWords: z.string().max(5000).optional(),
    customDeckCode: z.string().max(20).optional(),
    customDeckName: z.string().max(120).optional(),
    selectedPackIds: z.array(z.string().uuid()).max(20).optional(),
    targetLanguage: z.nativeEnum(Language),
  })
  .partial();

const modeSettingsPartialSchema = z
  .object({
    gameMode: z.nativeEnum(GameMode),
    classicRoundTime: z.number().int().min(10).max(300),
    imposterDiscussionTime: z
      .number()
      .int()
      .min(60)
      .max(15 * 60),
  })
  .partial();

const gameSettingsPartialSchema = z
  .object({
    general: generalSettingsPartialSchema.optional(),
    mode: modeSettingsPartialSchema.optional(),
  })
  .partial();

/** Exported for lobby-settings endpoint validation */
export { gameSettingsPartialSchema };

// --- Game action validation ---

const validActions = new Set([
  'CORRECT',
  'SKIP',
  'START_GAME',
  'START_DUEL',
  'START_ROUND',
  'START_PLAYING',
  'NEXT_ROUND',
  'RESET_GAME',
  'REMATCH',
  'GENERATE_TEAMS',
  'TEAM_JOIN',
  'TEAM_LEAVE',
  'TEAM_SHUFFLE_UNASSIGNED',
  'TEAM_SHUFFLE_ALL',
  'TEAM_LOCK',
  'TEAM_RENAME',
  'PAUSE_GAME',
  'TIME_UP',
  'CONFIRM_ROUND',
  'UPDATE_SETTINGS',
  'KICK_PLAYER',
  'ADD_OFFLINE_PLAYER',
  'REMOVE_OFFLINE_PLAYER',
  'GUESS_OPTION',
  'IMPOSTER_READY',
  'IMPOSTER_END_GAME',
]);

/**
 * Validate a game action payload.
 * Returns typed GameActionPayload or null if invalid.
 */
export function validateGameAction(raw: unknown): GameActionPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.action !== 'string' || !validActions.has(obj.action)) {
    console.warn('[Validation] Unknown action:', obj.action);
    return null;
  }

  const action = obj.action as GameActionPayload['action'];

  // Validate data per action type
  switch (action) {
    case 'UPDATE_SETTINGS': {
      const result = gameSettingsPartialSchema.safeParse(obj.data);
      if (!result.success) {
        console.warn('[Validation] Invalid settings:', result.error.issues);
        return null;
      }
      return { action, data: result.data as GameSettingsUpdate };
    }
    case 'KICK_PLAYER': {
      const uuidResult = z.string().uuid().safeParse(obj.data);
      if (!uuidResult.success) {
        console.warn('[Validation] Invalid KICK_PLAYER data: must be a UUID');
        return null;
      }
      return { action, data: uuidResult.data };
    }
    case 'GUESS_OPTION': {
      if (!obj.data || typeof obj.data !== 'object') {
        console.warn('[Validation] Invalid GUESS_OPTION data');
        return null;
      }
      const d = obj.data as Record<string, unknown>;
      if (
        typeof d.selectedOption !== 'string' ||
        d.selectedOption.length === 0 ||
        d.selectedOption.length > 200
      ) {
        console.warn('[Validation] Invalid GUESS_OPTION selectedOption');
        return null;
      }
      return { action, data: { selectedOption: d.selectedOption } };
    }
    case 'TEAM_JOIN': {
      if (!obj.data || typeof obj.data !== 'object') return null;
      const d = obj.data as Record<string, unknown>;
      const teamIdRes = z.string().min(1).max(32).safeParse(d.teamId);
      if (!teamIdRes.success) return null;
      const playerIdRes = d.playerId === undefined ? null : z.string().uuid().safeParse(d.playerId);
      if (playerIdRes && !playerIdRes.success) return null;
      return {
        action,
        data:
          playerIdRes && playerIdRes.success
            ? { teamId: teamIdRes.data, playerId: playerIdRes.data }
            : { teamId: teamIdRes.data },
      };
    }
    case 'TEAM_LEAVE': {
      // Allow no data (self-leave) or optional { playerId } (host unassign).
      if (obj.data === undefined) return { action };
      if (!obj.data || typeof obj.data !== 'object') return null;
      const d = obj.data as Record<string, unknown>;
      const playerIdRes = d.playerId === undefined ? null : z.string().uuid().safeParse(d.playerId);
      if (playerIdRes && !playerIdRes.success) return null;
      return playerIdRes && playerIdRes.success
        ? { action, data: { playerId: playerIdRes.data } }
        : { action };
    }
    case 'TEAM_LOCK': {
      if (!obj.data || typeof obj.data !== 'object') return null;
      const d = obj.data as Record<string, unknown>;
      const lockedRes = z.boolean().safeParse(d.locked);
      if (!lockedRes.success) return null;
      return { action, data: { locked: lockedRes.data } };
    }
    case 'TEAM_RENAME': {
      if (!obj.data || typeof obj.data !== 'object') return null;
      const d = obj.data as Record<string, unknown>;
      const teamIdRes = z.string().min(1).max(32).safeParse(d.teamId);
      const nameRes = z.string().min(1).max(18).safeParse(d.name);
      if (!teamIdRes.success || !nameRes.success) return null;
      return { action, data: { teamId: teamIdRes.data, name: nameRes.data } };
    }
    default:
      // Actions that don't need payload data on the wire (offline-only actions are rejected upstream).
      return { action } as GameActionPayload;
  }
}

// Helper to validate and return typed result or null
export function validatePayload<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.warn('[Validation] Invalid payload:', result.error.issues);
  return null;
}
