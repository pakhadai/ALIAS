import { describe, it, expect } from 'vitest';
import { PerRoomQueue } from '../PerRoomQueue';

describe('PerRoomQueue', () => {
  it('runs operations for the same room strictly in order', async () => {
    const q = new PerRoomQueue();
    const order: string[] = [];

    const p1 = q.run('ABC', async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 20));
      order.push('a-end');
    });

    const p2 = q.run('ABC', async () => {
      order.push('b');
    });

    await Promise.all([p1, p2]);

    expect(order).toEqual(['a-start', 'a-end', 'b']);
  });

  it('allows parallel work for different room codes', async () => {
    const q = new PerRoomQueue();
    let seq = 0;
    let r1Done = 0;
    let r2Done = 0;

    await Promise.all([
      q.run('R1', async () => {
        await new Promise((r) => setTimeout(r, 15));
        r1Done = ++seq;
      }),
      q.run('R2', async () => {
        r2Done = ++seq;
      }),
    ]);

    expect(r2Done).toBeLessThan(r1Done);
  });
});
