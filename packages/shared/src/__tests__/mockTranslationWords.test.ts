import { describe, it, expect } from 'vitest';
import { Category, Language } from '../enums';
import { buildMockTranslationDeckEntries } from '../mockTranslationWords';

describe('buildMockTranslationDeckEntries', () => {
  it('should pair UA Travel words with aligned EN translations', () => {
    const deck = buildMockTranslationDeckEntries(Language.UA, Language.EN, [Category.TRAVEL]);
    expect(deck).toContain('Літак|Airplane');
    expect(deck).toContain('Париж|Paris');
    expect(deck).toContain('Рюкзак|Backpack');
  });

  it('should pair UA General with DE using concept-aligned lists', () => {
    const deck = buildMockTranslationDeckEntries(Language.UA, Language.DE, [Category.GENERAL]);
    expect(deck).toContain('Кіт|Katze');
    expect(deck).toContain('Собака|Hund');
    expect(deck.length).toBeGreaterThan(100);
  });

  it('should return empty deck when source and target language match', () => {
    expect(buildMockTranslationDeckEntries(Language.UA, Language.UA, [Category.GENERAL])).toEqual(
      []
    );
  });
});
