import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameState } from '../../types';
import { MyWordPacksScreen } from './MyWordPacksScreen';

const setGameState = vi.fn();
const fetchMyDecks = vi.fn();

const authContextValue: {
  authState: { status: 'authenticated' } | { status: 'loading' };
  profile: {
    purchases?: Array<{ wordPack?: { slug: string } | null }>;
  } | null;
} = {
  authState: { status: 'authenticated' },
  profile: { purchases: [] },
};

vi.mock('../../services/api', () => ({
  fetchMyDecks: (...args: unknown[]) => fetchMyDecks(...args),
  createCustomDeck: vi.fn(),
  deleteCustomDeck: vi.fn(),
}));

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    currentTheme: {
      bg: 'bg-ui-bg',
      card: 'bg-ui-card',
      textMain: 'text-ui-fg',
      button: 'bg-ui-accent text-ui-accent-contrast',
      iconColor: 'text-ui-fg-muted',
      isDark: true,
    },
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => authContextValue,
}));

describe('MyWordPacksScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authContextValue.authState = { status: 'authenticated' };
    authContextValue.profile = { purchases: [] };
    fetchMyDecks.mockResolvedValue([]);
  });

  it('should show locked state and navigate to store when feature is not owned', async () => {
    render(<MyWordPacksScreen />);

    expect(screen.getByText('Функція заблокована')).toBeInTheDocument();
    expect(screen.getByText('Відкрити магазин')).toBeInTheDocument();
    expect(fetchMyDecks).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Відкрити магазин' }));
    expect(setGameState).toHaveBeenCalledWith(GameState.STORE);
  });

  it('should render deck list and open create view when unlocked', async () => {
    authContextValue.profile = {
      purchases: [{ wordPack: { slug: 'feature-custom-packs' } }],
    };
    fetchMyDecks.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'Office party',
        accessCode: 'ABCD12',
        status: 'approved',
        wordCount: 42,
        branding: null,
        createdAt: '2026-06-01T12:00:00.000Z',
      },
    ]);

    render(<MyWordPacksScreen />);

    await waitFor(() => {
      expect(fetchMyDecks).toHaveBeenCalledOnce();
      expect(screen.getByText('Office party')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Створити пак' }));

    expect(screen.getByText('Новий пак')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('наприклад: Офісна вечірка')).toBeInTheDocument();
  });
});
