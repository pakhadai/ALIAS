import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XCircle } from 'lucide-react';
import { PlayerStatsDetailPanel } from './PlayerStatsDetailPanel';

describe('PlayerStatsDetailPanel', () => {
  it('should render section title and stat rows', () => {
    render(
      <PlayerStatsDetailPanel
        title="Details"
        rows={[{ label: 'Skipped', value: '4', icon: XCircle }]}
        isDark={false}
        themeTextMain="text-ui-fg"
        themeIconColor="text-ui-fg-muted"
      />
    );

    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
