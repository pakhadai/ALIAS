import { describe, it, expect } from 'vitest';
import { HardcoreModeHandler } from '../HardcoreModeHandler';

describe('HardcoreModeHandler', () => {
  const handler = new HardcoreModeHandler();
  const task = { id: 't1', prompt: 'word' };

  it('generateTask pops from deck', () => {
    const deck = ['a', 'b'];
    const t = handler.generateTask(deck, {} as never);
    expect(t.prompt).toBe('b');
    expect(deck).toEqual(['a']);
  });

  it('CORRECT advances to next word', () => {
    const r = handler.handleAction({ action: 'CORRECT' }, task, { room: {} as never });
    expect(r.nextWord).toBe(true);
    expect(r.endTurn).toBe(false);
  });

  it('SKIP ends turn without next word', () => {
    const r = handler.handleAction({ action: 'SKIP' }, task, { room: {} as never });
    expect(r.nextWord).toBe(false);
    expect(r.endTurn).toBe(true);
  });

  it('unknown action does nothing', () => {
    const r = handler.handleAction({ action: 'START_GAME' } as never, task as never, {
      room: {} as never,
    });
    expect(r.nextWord).toBe(false);
    expect(r.endTurn).toBe(false);
  });
});
