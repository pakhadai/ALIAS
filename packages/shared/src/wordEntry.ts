/** Hardcore sub-variant: taboo list, skip ends turn, or both. */
export type HardcoreVariant = 'TABOO' | 'SKIP_ENDS_TURN' | 'MAX';

export const DEFAULT_HARDCORE_VARIANT: HardcoreVariant = 'SKIP_ENDS_TURN';

export type WordEntryV1 = {
  v: 1;
  word: string;
  hint?: string;
  tabooWords?: string[];
};

function isWordEntryV1(value: unknown): value is WordEntryV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o.v !== 1) return false;
  if (typeof o.word !== 'string' || o.word.length === 0) return false;
  if (o.hint !== undefined && typeof o.hint !== 'string') return false;
  if (o.tabooWords !== undefined) {
    if (!Array.isArray(o.tabooWords)) return false;
    if (!o.tabooWords.every((t) => typeof t === 'string')) return false;
  }
  return true;
}

/** Encode word + optional hint/taboo into JSON deck entry (v:1). */
export function encodeWordEntry(entry: {
  word: string;
  hint?: string | null;
  tabooWords?: string[] | null;
}): string {
  const word = entry.word.trim();
  const hint = entry.hint?.trim() || undefined;
  const tabooWords = (entry.tabooWords ?? []).map((t) => t.trim()).filter(Boolean);
  const payload: WordEntryV1 = { v: 1, word };
  if (hint) payload.hint = hint;
  if (tabooWords.length > 0) payload.tabooWords = tabooWords;
  return JSON.stringify(payload);
}

/** Decode JSON v:1 deck entry; returns null for plain words or invalid JSON. */
export function decodeWordEntry(raw: string): WordEntryV1 | null {
  if (!raw || raw[0] !== '{') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isWordEntryV1(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
