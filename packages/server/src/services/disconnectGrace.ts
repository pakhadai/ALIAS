/** Grace-period removal timers (playerId → timeout). Cancel on rejoin / intentional leave / kick. */

const pending = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleGraceRemoval(playerId: string, delayMs: number, onFire: () => void): void {
  cancelGraceRemoval(playerId);
  pending.set(
    playerId,
    setTimeout(() => {
      pending.delete(playerId);
      onFire();
    }, delayMs)
  );
}

export function cancelGraceRemoval(playerId: string): void {
  const t = pending.get(playerId);
  if (t) clearTimeout(t);
  pending.delete(playerId);
}
