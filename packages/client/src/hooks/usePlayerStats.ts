import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserProfile, PlayerStatsPayload } from '../services/api';
import { getAuthToken, postPlayerStatsDelta, mergeLocalPlayerStats } from '../services/api';

const LEGACY_STORAGE_KEY = 'alias_player_stats_v1';
const MIGRATION_DONE_KEY = 'alias_player_stats_server_merged_v1';
const FLUSH_DEBOUNCE_MS = 4000;

export interface PlayerStats {
  gamesPlayed: number;
  wordsGuessed: number;
  wordsSkipped: number;
  lastPlayed: string;
}

const defaultStats = (): PlayerStats => ({
  gamesPlayed: 0,
  wordsGuessed: 0,
  wordsSkipped: 0,
  lastPlayed: '',
});

let serverBaseline: PlayerStats = defaultStats();
const pending = { gamesPlayed: 0, wordsGuessed: 0, wordsSkipped: 0 };
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

function hasPendingDeltas(): boolean {
  return pending.gamesPlayed > 0 || pending.wordsGuessed > 0 || pending.wordsSkipped > 0;
}

function applyServerPayload(p: PlayerStatsPayload) {
  serverBaseline = {
    gamesPlayed: p.gamesPlayed,
    wordsGuessed: p.wordsGuessed,
    wordsSkipped: p.wordsSkipped,
    lastPlayed: p.lastPlayed || '',
  };
  notifySubscribers();
}

/** Call after every successful `fetchProfile` to keep UI in sync with the server. */
export function syncPlayerStatsFromProfile(profile: UserProfile) {
  if (profile.playerStats) {
    applyServerPayload(profile.playerStats);
  }
}

/**
 * If legacy localStorage stats exist, merge them once into the server account then remove the key.
 */
export async function migrateLegacyPlayerStatsOnce(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;
  if (!getAuthToken()) return;

  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let parsed: Partial<PlayerStats>;
  try {
    parsed = JSON.parse(raw) as Partial<PlayerStats>;
  } catch {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return;
  }

  const legacy: PlayerStatsPayload = {
    gamesPlayed: Math.max(0, Math.floor(Number(parsed.gamesPlayed) || 0)),
    wordsGuessed: Math.max(0, Math.floor(Number(parsed.wordsGuessed) || 0)),
    wordsSkipped: Math.max(0, Math.floor(Number(parsed.wordsSkipped) || 0)),
    lastPlayed: typeof parsed.lastPlayed === 'string' ? parsed.lastPlayed : '',
  };

  const hasTotals =
    legacy.gamesPlayed > 0 || legacy.wordsGuessed > 0 || legacy.wordsSkipped > 0;
  const hasLast = legacy.lastPlayed.length > 0;
  if (!hasTotals && !hasLast) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.setItem(MIGRATION_DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const merged = await mergeLocalPlayerStats(legacy);
    applyServerPayload(merged);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.setItem(MIGRATION_DONE_KEY, '1');
  } catch {
    // Retry on next profile load
  }
}

async function flushPendingToServer(): Promise<void> {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (!hasPendingDeltas()) return;

  if (!getAuthToken()) return;

  const batch = {
    gamesPlayed: pending.gamesPlayed,
    wordsGuessed: pending.wordsGuessed,
    wordsSkipped: pending.wordsSkipped,
  };
  pending.gamesPlayed = 0;
  pending.wordsGuessed = 0;
  pending.wordsSkipped = 0;

  try {
    const next = await postPlayerStatsDelta(batch);
    applyServerPayload(next);
  } catch {
    pending.gamesPlayed += batch.gamesPlayed;
    pending.wordsGuessed += batch.wordsGuessed;
    pending.wordsSkipped += batch.wordsSkipped;
    notifySubscribers();
  }
}

function scheduleDebouncedFlush() {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushPendingToServer();
  }, FLUSH_DEBOUNCE_MS);
}

/** Flush pending stat deltas immediately (e.g. game over, screen unmount). */
export function flushPlayerStats(): Promise<void> {
  return flushPendingToServer();
}

function mergedView(): PlayerStats {
  return {
    gamesPlayed: serverBaseline.gamesPlayed + pending.gamesPlayed,
    wordsGuessed: serverBaseline.wordsGuessed + pending.wordsGuessed,
    wordsSkipped: serverBaseline.wordsSkipped + pending.wordsSkipped,
    lastPlayed: hasPendingDeltas()
      ? new Date().toISOString()
      : serverBaseline.lastPlayed,
  };
}

export function usePlayerStats() {
  const [, setGen] = useState(0);
  const bump = useCallback(() => setGen((n) => n + 1), []);

  useEffect(() => {
    subscribers.add(bump);
    return () => {
      subscribers.delete(bump);
    };
  }, [bump]);

  const get = useCallback((): PlayerStats => mergedView(), []);

  const increment = useCallback((key: keyof Omit<PlayerStats, 'lastPlayed'>, by = 1) => {
    const n = Math.max(1, Math.floor(by));
    if (key === 'gamesPlayed') pending.gamesPlayed += n;
    else if (key === 'wordsGuessed') pending.wordsGuessed += n;
    else if (key === 'wordsSkipped') pending.wordsSkipped += n;
    notifySubscribers();
    scheduleDebouncedFlush();
  }, []);

  const reset = useCallback(() => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pending.gamesPlayed = 0;
    pending.wordsGuessed = 0;
    pending.wordsSkipped = 0;
    notifySubscribers();
  }, []);

  return useMemo(
    () => ({ get, increment, reset, flush: flushPlayerStats }),
    [get, increment, reset]
  );
}
