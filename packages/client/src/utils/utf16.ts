/** Truncate to max UTF-16 code units without splitting a surrogate pair. */
export function truncateUtf16Safe(s: string, maxUnits: number): string {
  if (maxUnits <= 0) return '';
  let out = '';
  let i = 0;
  while (i < s.length) {
    const code = s.charCodeAt(i);
    const isHigh = code >= 0xd800 && code <= 0xdbff && i + 1 < s.length;
    const charLen = isHigh ? 2 : 1;
    if (out.length + charLen > maxUnits) break;
    out += s.slice(i, i + charLen);
    i += charLen;
  }
  return out;
}

/** Fullwidth digits (e.g. mobile IME) → ASCII 0–9. */
export function normalizeAsciiDigits(s: string): string {
  return s.replace(/[\uFF10-\uFF19]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30)
  );
}
