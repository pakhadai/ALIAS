/** Max increment per request / per legacy import field (abuse guard). */
export const PLAYER_STATS_MAX_DELTA = 1_000_000;

export function parseNonNegInt(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 0 || n > PLAYER_STATS_MAX_DELTA) return null;
  return Math.floor(n);
}

export function maxDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}
