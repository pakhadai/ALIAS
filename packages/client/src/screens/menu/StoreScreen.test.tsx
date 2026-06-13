import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameState } from '../../types';
import { StoreScreen } from './StoreScreen';

const setGameState = vi.fn();
const showNotification = vi.fn();
const requestLogin = vi.fn();
const fetchStore = vi.fn();

let isAuthenticated = false;

const mockStoreCatalog = {
  wordPacks: [
    {
      id: 'feature-custom',
      slug: 'feature-custom-packs',
      name: 'Custom packs',
      price: 499,
      isFree: false,
      owned: false,
      language: 'UA',
      category: 'Feature',
      difficulty: 'easy',
      wordCount: 0,
      description: 'Create your own decks',
      isDefault: false,
    },
    {
      id: 'pack-ua-1',
      slug: 'ua-basic',
      name: 'UA Basic',
      price: 299,
      isFree: false,
      owned: false,
      language: 'UA',
      category: 'General',
      difficulty: 'easy',
      wordCount: 120,
      description: null,
      isDefault: false,
    },
  ],
  themes: [],
  soundPacks: [],
};

vi.mock('../../services/api', () => ({
  fetchStore: (...args: unknown[]) => fetchStore(...args),
  claimFreeItem: vi.fn(),
}));

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    showNotification,
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
  useAuthContext: () => ({ isAuthenticated }),
}));

vi.mock('../../context/AppLoginContext', () => ({
  useAppLogin: () => ({ requestLogin }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    storeAuthRequiredToast: 'Sign in to purchase',
  }),
}));

vi.mock('../../components/Store/QuickBuyModal', () => ({
  QuickBuyModal: ({
    itemType,
    itemId,
    onClose,
  }: {
    itemType: string;
    itemId: string;
    onClose: () => void;
  }) => (
    <div data-testid="quick-buy-modal">
      <span>
        {itemType}:{itemId}
      </span>
      <button type="button" onClick={onClose}>
        Close quick buy
      </button>
    </div>
  ),
}));

describe('StoreScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = false;
    fetchStore.mockResolvedValue(mockStoreCatalog);
    window.history.replaceState({}, '', '/');
  });

  it('should render store catalog after fetch', async () => {
    render(<StoreScreen />);

    expect(screen.getByText('Магазин')).toBeInTheDocument();
    expect(screen.getByText('Набори слів')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchStore).toHaveBeenCalledOnce();
      expect(screen.getByText('Custom packs')).toBeInTheDocument();
      expect(screen.getByText('UA Basic')).toBeInTheDocument();
    });
  });

  it('should redirect guest to profile when buying a paid pack', async () => {
    render(<StoreScreen />);

    const buyButton = await screen.findByRole('button', { name: '$4.99' });
    await userEvent.click(buyButton);

    expect(showNotification).toHaveBeenCalledWith('Sign in to purchase', 'info');
    expect(setGameState).toHaveBeenCalledWith(GameState.PROFILE);
    expect(requestLogin).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('quick-buy-modal')).not.toBeInTheDocument();
  });

  it('should open QuickBuy modal for authenticated user', async () => {
    isAuthenticated = true;

    render(<StoreScreen />);

    const buyButton = await screen.findByRole('button', { name: '$4.99' });
    await userEvent.click(buyButton);

    expect(screen.getByTestId('quick-buy-modal')).toBeInTheDocument();
    expect(screen.getByText('wordPack:feature-custom')).toBeInTheDocument();
    expect(requestLogin).not.toHaveBeenCalled();
  });
});
