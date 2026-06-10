import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Language } from '../../types';
import { LanguageChipRow } from './LanguageChipRow';

vi.mock('../../utils/haptics', () => ({
  HAPTIC: { nav: 1 },
  vibrate: vi.fn(),
}));

describe('LanguageChipRow', () => {
  it('should render flags and invoke onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<LanguageChipRow value={Language.UA} onChange={onChange} />);

    expect(screen.getByText('🇺🇦')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /DE/i }));
    expect(onChange).toHaveBeenCalledWith(Language.DE);
  });
});
