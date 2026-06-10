import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsToggle } from './SettingsToggle';

vi.mock('../../utils/haptics', () => ({
  HAPTIC: { nav: 1 },
  vibrate: vi.fn(),
}));

describe('SettingsToggle', () => {
  it('should toggle checked state with haptic on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SettingsToggle
        checked={false}
        onChange={onChange}
        title="Skip penalty"
        hint="−1 point"
        enabledLabel="On"
        disabledLabel="Off"
        ariaLabel="Skip penalty"
      />
    );

    const toggle = screen.getByRole('switch', { name: 'Skip penalty' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
