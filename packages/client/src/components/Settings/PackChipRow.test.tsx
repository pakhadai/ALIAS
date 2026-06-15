import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PackChipRow } from './PackChipRow';

vi.mock('../../utils/haptics', () => ({
  HAPTIC: { nav: 1 },
  vibrate: vi.fn(),
}));

describe('PackChipRow', () => {
  it('should toggle pack selection via chip', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <PackChipRow
        packs={[{ id: 'p1', name: 'Starter', wordCount: 120 }]}
        selectedIds={[]}
        onToggle={onToggle}
      />
    );

    await user.click(screen.getByRole('button', { name: /Starter/i }));
    expect(onToggle).toHaveBeenCalledWith('p1');
  });

  it('should disable chips when disabled', () => {
    render(
      <PackChipRow
        packs={[{ id: 'p1', name: 'Starter', wordCount: 120 }]}
        selectedIds={[]}
        onToggle={vi.fn()}
        disabled
      />
    );

    expect(screen.getByRole('button', { name: /Starter/i })).toBeDisabled();
  });
});
