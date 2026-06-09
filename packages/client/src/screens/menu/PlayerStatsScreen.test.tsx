import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameState } from '../../types';
import { PlayerStatsScreen } from './PlayerStatsScreen';

const setGameState = vi.fn();
const requestLogin = vi.fn();

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    currentTheme: {
      bg: 'bg-ui-bg',
      textMain: 'text-ui-fg',
      textSecondary: 'text-ui-fg-muted',
      iconColor: 'text-ui-fg-muted',
      button: 'bg-ui-accent text-ui-accent-contrast',
      isDark: false,
    },
    uiLanguage: 'UA',
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({ isAuthenticated: true }),
}));

vi.mock('../../context/AppLoginContext', () => ({
  useAppLogin: () => ({ requestLogin }),
}));

const getStats = vi.fn(() => ({
  gamesPlayed: 3,
  wordsGuessed: 24,
  wordsSkipped: 6,
  lastPlayed: '2026-06-01T12:00:00.000Z',
}));

vi.mock('../../hooks/usePlayerStats', () => ({
  usePlayerStats: () => ({ get: getStats }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    statsScreenTitle: 'Моя статистика',
    profileStatsCardGames: 'Зіграно',
    profileStatsCardGuessed: 'Вгадано',
    profileStatsCardAccuracy: 'Точність',
    profileTapForDetails: 'Натисніть для деталей',
    statsSectionDetails: 'Деталі',
    statsRowWordsSkipped: 'Пропущено',
    statsLastPlayedPrefix: 'Остання гра:',
    statsSyncedBadge: 'Збережено в акаунті',
    statsEmptyTitle: 'Ще немає ігор',
    statsEmptyBody: 'Зіграй перший раунд',
    statsEmptyCta: 'Почати гру',
    statsGuestBannerBody: 'Увійдіть',
    statsGuestBannerCta: 'Увійти',
    goBack: 'Назад',
  }),
}));

describe('PlayerStatsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStats.mockReturnValue({
      gamesPlayed: 3,
      wordsGuessed: 24,
      wordsSkipped: 6,
      lastPlayed: '2026-06-01T12:00:00.000Z',
    });
  });

  it('should render hero stats and detail panel when stats exist', () => {
    render(<PlayerStatsScreen />);

    expect(screen.getByTestId('player-stats-header-title')).toHaveTextContent('Моя статистика');
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Деталі')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByTestId('player-stats-synced')).toHaveTextContent('Збережено в акаунті');
    expect(screen.queryByTestId('player-stats-empty')).not.toBeInTheDocument();
  });

  it('should show empty state and hide detail panel when all stats are zero', () => {
    getStats.mockReturnValue({
      gamesPlayed: 0,
      wordsGuessed: 0,
      wordsSkipped: 0,
      lastPlayed: '',
    });

    render(<PlayerStatsScreen />);

    expect(screen.getByTestId('player-stats-empty')).toBeInTheDocument();
    expect(screen.queryByText('Деталі')).not.toBeInTheDocument();
  });

  it('should navigate to menu from empty state CTA', async () => {
    getStats.mockReturnValue({
      gamesPlayed: 0,
      wordsGuessed: 0,
      wordsSkipped: 0,
      lastPlayed: '',
    });

    render(<PlayerStatsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Почати гру' }));

    expect(setGameState).toHaveBeenCalledWith(GameState.MENU);
  });
});
