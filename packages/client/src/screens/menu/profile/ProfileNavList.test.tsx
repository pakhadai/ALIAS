import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileNavList } from './ProfileNavList';

const labels = {
  sectionGame: 'GAME',
  sectionSettings: 'SETTINGS',
  sectionExtra: 'EXTRA',
  myStats: 'My statistics',
  myPacks: 'My word packs',
  unlockPacks: 'Unlock custom packs',
  unlockPacksSub: 'Available in the store',
  profileSettings: 'Profile settings',
  lobbySettings: 'Lobby settings',
  lobbySettingsSub: 'Defaults for new games',
  store: 'Store',
  adminPanel: 'Admin panel',
};

const baseProps = {
  isDark: false,
  themeTextMain: 'text-ui-fg',
  themeIconColor: 'text-ui-fg',
  themeButtonClass: 'bg-ui-accent',
  hasCustomPacks: true,
  showAdminEntry: false,
  labels,
  onMyStats: vi.fn(),
  onMyPacks: vi.fn(),
  onProfileSettings: vi.fn(),
  onLobbySettings: vi.fn(),
  onStore: vi.fn(),
  onAdminPanel: vi.fn(),
};

describe('ProfileNavList', () => {
  it('should render grouped sections and stats entry', () => {
    render(<ProfileNavList {...baseProps} />);

    expect(screen.getByText('GAME')).toBeInTheDocument();
    expect(screen.getByText('SETTINGS')).toBeInTheDocument();
    expect(screen.getByText('EXTRA')).toBeInTheDocument();
    expect(screen.getByText('My statistics')).toBeInTheDocument();
  });

  it('should navigate to stats when my stats is clicked', async () => {
    const onMyStats = vi.fn();
    render(<ProfileNavList {...baseProps} onMyStats={onMyStats} />);

    await userEvent.click(screen.getByText('My statistics'));

    expect(onMyStats).toHaveBeenCalledOnce();
  });

  it('should show lobby settings subtitle when provided', () => {
    render(<ProfileNavList {...baseProps} />);

    expect(screen.getByText('Defaults for new games')).toBeInTheDocument();
  });

  it('should show admin entry when enabled', () => {
    render(<ProfileNavList {...baseProps} showAdminEntry />);

    expect(screen.getByText('Admin panel')).toBeInTheDocument();
  });
});
