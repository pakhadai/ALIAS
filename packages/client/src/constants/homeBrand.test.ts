import { describe, it, expect } from 'vitest';

import { DEFAULT_HOME_TAGLINE, HOME_WORD_RAIN_WORDS, buildHomeWordRainItems } from './homeBrand';

describe('homeBrand', () => {
  it('should expose a non-empty default home tagline', () => {
    expect(DEFAULT_HOME_TAGLINE.length).toBeGreaterThan(0);
    expect(DEFAULT_HOME_TAGLINE).toContain('·');
  });

  it('should build stable word rain items for each ambient word', () => {
    const items = buildHomeWordRainItems();

    expect(items).toHaveLength(HOME_WORD_RAIN_WORDS.length);
    expect(items[0]?.text).toBe(HOME_WORD_RAIN_WORDS[0]);
    expect(items[0]?.leftPercent).toBeGreaterThanOrEqual(0);
    expect(items[0]?.durationSec).toBeGreaterThan(0);
  });
});
