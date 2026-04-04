/**
 * Serializes async work per room so concurrent Socket.io handlers cannot interleave
 * mutations on the same in-memory Room (Node async still yields between awaits).
 */
export class PerRoomQueue {
  private tails = new Map<string, Promise<unknown>>();

  /**
   * Run `fn` after all prior operations for `roomCode` have finished.
   */
  run<T>(roomCode: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.tails.get(roomCode) ?? Promise.resolve();
    const result = prev.then(fn);
    this.tails.set(
      roomCode,
      result.then(
        () => undefined,
        () => undefined
      )
    );
    return result;
  }
}
