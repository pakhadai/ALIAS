import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsTabBar } from './SettingsTabBar';

vi.mock('../../utils/haptics', () => ({
  HAPTIC: { nav: 1 },
  vibrate: vi.fn(),
}));

describe('SettingsTabBar', () => {
  it('should render tabs and invoke onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SettingsTabBar
        tabs={[
          { id: 'mode', label: 'Mode' },
          { id: 'content', label: 'Dictionary' },
          { id: 'rules', label: 'Rules' },
        ]}
        value="mode"
        onChange={onChange}
      />
    );

    expect(screen.getByRole('tab', { name: 'Mode' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Dictionary' }));
    expect(onChange).toHaveBeenCalledWith('content');
  });
});
