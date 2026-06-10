import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsSlider } from './SettingsSlider';

vi.mock('../../utils/haptics', () => ({
  HAPTIC: { nav: 1 },
  vibrate: vi.fn(),
}));

describe('SettingsSlider', () => {
  it('should call onChange when range value changes', () => {
    const onChange = vi.fn();

    render(
      <SettingsSlider
        label="Score to win"
        value={30}
        displayValue="30"
        min={10}
        max={100}
        step={5}
        onChange={onChange}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '45' } });
    expect(onChange).toHaveBeenCalledWith(45);
    expect(screen.getByText('Score to win')).toBeVisible();
    expect(screen.getByText('30')).toBeVisible();
  });
});
