/** Fisher–Yates shuffle (safe under noUncheckedIndexedAccess). */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const left = shuffled[i];
    const right = shuffled[j];
    if (left === undefined || right === undefined) continue;
    shuffled[i] = right;
    shuffled[j] = left;
  }
  return shuffled;
}
