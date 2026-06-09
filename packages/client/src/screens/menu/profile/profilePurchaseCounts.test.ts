import { describe, it, expect } from 'vitest';
import { countProfilePurchases } from './profilePurchaseCounts';

describe('countProfilePurchases', () => {
  it('should return zeros when purchases are undefined', () => {
    expect(countProfilePurchases(undefined)).toEqual({
      wordPacks: 0,
      themes: 0,
      hasCustomPacks: false,
    });
  });

  it('should count word packs, themes, and custom packs feature separately', () => {
    const result = countProfilePurchases([
      {
        id: '1',
        wordPackId: 'wp1',
        wordPack: { slug: 'pack-ua' },
        themeId: null,
        soundPackId: null,
        createdAt: '',
      },
      {
        id: '2',
        wordPackId: 'wp2',
        wordPack: { slug: 'pack-en' },
        themeId: null,
        soundPackId: null,
        createdAt: '',
      },
      {
        id: '3',
        wordPackId: 'feat',
        wordPack: { slug: 'feature-custom-packs' },
        themeId: null,
        soundPackId: null,
        createdAt: '',
      },
      {
        id: '4',
        wordPackId: null,
        wordPack: null,
        themeId: 'theme1',
        soundPackId: null,
        createdAt: '',
      },
    ]);

    expect(result).toEqual({
      wordPacks: 2,
      themes: 1,
      hasCustomPacks: true,
    });
  });
});
