import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreenTitle } from './ScreenTitle';
import { typographyClass } from '../../constants/typography';

describe('ScreenTitle', () => {
  it('should render with typography heading classes', () => {
    render(<ScreenTitle>Profile</ScreenTitle>);

    const heading = screen.getByRole('heading', { level: 2, name: 'Profile' });
    expect(heading.className).toContain('text-ui-heading');
    expect(heading.className).toContain('font-serif');
    expect(heading.className).toContain('tracking-wide');
  });

  it('should support custom element, theme class, and extra className', () => {
    render(
      <ScreenTitle as="h1" themeClass="text-ui-accent" className="mt-5 text-center">
        Hero
      </ScreenTitle>
    );

    const heading = screen.getByRole('heading', { level: 1, name: 'Hero' });
    expect(heading.className).toContain(typographyClass.heading);
    expect(heading.className).toContain('text-ui-accent');
    expect(heading.className).toContain('mt-5');
    expect(heading.className).toContain('text-center');
  });
});
