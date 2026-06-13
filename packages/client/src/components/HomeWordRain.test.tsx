import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HomeWordRain } from './HomeWordRain';
import { HOME_WORD_RAIN_WORDS } from '../constants/homeBrand';

describe('HomeWordRain', () => {
  it('should render decorative multilingual words hidden from assistive tech', () => {
    const { container } = render(<HomeWordRain />);

    const root = container.querySelector('.home-word-rain');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('aria-hidden', 'true');

    for (const word of HOME_WORD_RAIN_WORDS) {
      expect(screen.getByText(word)).toBeInTheDocument();
    }
  });
});
