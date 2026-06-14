import { describe, expect, it } from 'vitest';
import { decodeWordEntry, encodeWordEntry } from '../wordEntry';

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
