import { describe, expect, it } from 'vitest';
import { decodeWordEntry, encodeWordEntry, translationTaskFromDeckEntry } from '../wordEntry';

describe('wordEntry', () => {
  it('encodeWordEntry round-trips word + hint + tabooWords', () => {
    const raw = encodeWordEntry({
      word: 'Кіт',
      hint: 'Домашня тварина',
      tabooWords: ['мяу', 'миша'],
    });
    expect(decodeWordEntry(raw)).toEqual({
      v: 1,
      word: 'Кіт',
      hint: 'Домашня тварина',
      tabooWords: ['мяу', 'миша'],
    });
  });

  it('encodeWordEntry omits empty hint and taboo', () => {
    const raw = encodeWordEntry({ word: 'Стіл' });
    expect(raw).toBe('{"v":1,"word":"Стіл"}');
    expect(decodeWordEntry(raw)).toEqual({ v: 1, word: 'Стіл' });
  });

  it('decodeWordEntry returns null for plain words', () => {
    expect(decodeWordEntry('Яблуко')).toBeNull();
    expect(decodeWordEntry('')).toBeNull();
  });

  it('decodeWordEntry returns null for invalid JSON', () => {
    expect(decodeWordEntry('{not-json')).toBeNull();
    expect(decodeWordEntry('{"v":2,"word":"x"}')).toBeNull();
  });
});

describe('translationTaskFromDeckEntry', () => {
  it('should split pipe format into prompt and answer', () => {
    const task = translationTaskFromDeckEntry('кіт|cat', 't1');
    expect(task).toEqual({ id: 't1', prompt: 'кіт', answer: 'cat' });
  });

  it('should map JSON hint field to answer for flip UI', () => {
    const raw = encodeWordEntry({ word: 'Кіт', hint: 'Cat' });
    const task = translationTaskFromDeckEntry(raw, 't2');
    expect(task.prompt).toBe('Кіт');
    expect(task.answer).toBe('Cat');
    expect(task.hint).toBeUndefined();
  });

  it('should return prompt-only task when no translation is present', () => {
    expect(translationTaskFromDeckEntry('plainword', 't3')).toEqual({
      id: 't3',
      prompt: 'plainword',
    });
  });
});
