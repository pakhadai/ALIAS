import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Logo } from './Shared';
import { THEME_CONFIG, DEFAULT_APP_THEME } from '../constants';

describe('Logo', () => {
  it('should render localized tagline with flanking dividers', () => {
    const theme = THEME_CONFIG[DEFAULT_APP_THEME];

    render(<Logo theme={theme} tagline="Говори · Вгадуй" />);

    expect(screen.getByLabelText('MOVLI')).toBeInTheDocument();
    expect(screen.getByText('Говори · Вгадуй')).toBeInTheDocument();
  });

  it('should fall back to default tagline when none is provided', () => {
    const theme = THEME_CONFIG[DEFAULT_APP_THEME];

    render(<Logo theme={theme} />);

    expect(screen.getByText('Speak · Guess')).toBeInTheDocument();
  });
});
