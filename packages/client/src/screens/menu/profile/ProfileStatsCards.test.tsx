import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileStatsCards } from './ProfileStatsCards';

const baseProps = {
  gamesPlayed: 12,
  wordsGuessed: 84,
  accuracy: 76,
  labels: {
    games: 'Played',
    guessed: 'Guessed',
    accuracy: 'Accuracy',
    tapForDetails: 'Tap for details',
  },
  isDark: false,
  themeTextMain: 'text-ui-fg',
  themeTextSecondary: 'text-ui-fg-muted',
  onPress: vi.fn(),
};

describe('ProfileStatsCards', () => {
  it('should render stat values and labels', () => {
    render(<ProfileStatsCards {...baseProps} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
    expect(screen.getByText('76%')).toBeInTheDocument();
    expect(screen.getByText('Played')).toBeInTheDocument();
    expect(screen.getByText('Tap for details')).toBeInTheDocument();
  });

  it('should call onPress when tapped', async () => {
    const onPress = vi.fn();
    render(<ProfileStatsCards {...baseProps} onPress={onPress} />);

    await userEvent.click(screen.getByRole('button', { name: 'Tap for details' }));

    expect(onPress).toHaveBeenCalledOnce();
  });

  it('should render read-only summary without a button when onPress is omitted', () => {
    const { onPress: _onPress, ...readOnlyProps } = baseProps;
    render(<ProfileStatsCards {...readOnlyProps} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Tap for details')).not.toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
