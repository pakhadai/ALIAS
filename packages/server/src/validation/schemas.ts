import { z } from 'zod';
import { Language, Category, SoundPreset, AppTheme } from '@alias/shared';
import type { GameActionPayload } from '@alias/shared';

// --- Socket event payloads ---

export const roomCreateSchema = z.object({
  playerName: z.string().min(1).max(20).transform(s => s.replace(/<[^>]*>/g, '')),
  avatar: z.string().min(1).max(4),
  avatarId: z.string().max(3).optional().nullable(),
});

export const roomJoinSchema = z.object({
  roomCode: z.string().regex(/^\d{5}$/, 'Room code must be 5 digits'),
  playerName: z.string().min(1).max(20).transform(s => s.replace(/<[^>]*>/g, '')),
  avatar: z.string().min(1).max(4),
  avatarId: z.string().max(3).optional().nullable(),
});

// --- Game settings validation ---

const gameSettingsPartialSchema = z.object({
  language: z.nativeEnum(Language),
  roundTime: z.number().int().min(10).max(300),
  scoreToWin: z.number().int().min(5).max(100),
  skipPenalty: z.boolean(),
  categories: z.array(z.nativeEnum(Category)).min(1).max(10),
  soundEnabled: z.boolean(),
  soundPreset: z.nativeEnum(SoundPreset),
  teamCount: z.number().int().min(2).max(8),
  theme: z.nativeEnum(AppTheme),
  customWords: z.string().max(5000).optional(),
  customDeckCode: z.string().max(20).optional(),
  selectedPackIds: z.array(z.string().uuid()).max(20).optional(),
}).partial();

// --- Game action validation ---

const validActions = new Set([
  'CORRECT', 'SKIP', 'START_GAME', 'START_DUEL', 'START_ROUND',
  'START_PLAYING', 'NEXT_ROUND', 'RESET_GAME', 'REMATCH',
  'GENERATE_TEAMS', 'PAUSE_GAME', 'TIME_UP', 'CONFIRM_ROUND',
  'UPDATE_SETTINGS', 'KICK_PLAYER',
  'ADD_OFFLINE_PLAYER', 'REMOVE_OFFLINE_PLAYER',
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
      return { action, data: result.data };
    }
    case 'KICK_PLAYER': {
      if (typeof obj.data !== 'string' || obj.data.length === 0 || obj.data.length > 100) {
        console.warn('[Validation] Invalid KICK_PLAYER data');
        return null;
      }
      return { action, data: obj.data };
    }
    default:
      // Actions that don't need data
      return { action };
  }
}

// Helper to validate and return typed result or null
export function validatePayload<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  console.warn('[Validation] Invalid payload:', result.error.issues);
  return null;
}
