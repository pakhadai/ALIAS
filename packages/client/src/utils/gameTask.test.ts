import { describe, expect, it } from 'vitest';
import { GameMode, encodeWordEntry } from '@movli/shared';
import { buildOfflineTask } from './gameTask';

describe('buildOfflineTask', () => {
  it('should build TRANSLATION task from pipe format', () => {
    const task = buildOfflineTask('кіт|cat', [], GameMode.TRANSLATION, 'offline-1');
    expect(task).toEqual({ id: 'offline-1', prompt: 'кіт', answer: 'cat' });
  });

  it('should map JSON hint to answer in TRANSLATION mode', () => {
    const raw = encodeWordEntry({ word: 'Кіт', hint: 'Cat' });
    const task = buildOfflineTask(raw, [], GameMode.TRANSLATION, 'offline-2');
    expect(task.prompt).toBe('Кіт');
    expect(task.answer).toBe('Cat');
    expect(task.hint).toBeUndefined();
  });

  it('should keep hint on classic JSON entries', () => {
    const raw = encodeWordEntry({ word: 'Кіт', hint: 'Тварина' });
    const task = buildOfflineTask(raw, [], GameMode.CLASSIC, 'offline-3');
    expect(task.prompt).toBe('Кіт');
    expect(task.hint).toBe('Тварина');
    expect(task.answer).toBeUndefined();
  });
});
