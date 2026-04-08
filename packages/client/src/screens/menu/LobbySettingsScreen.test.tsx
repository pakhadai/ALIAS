import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbySettingsScreen } from './LobbySettingsScreen';
import type { GameSettings } from '../../types';

const setGameState = vi.fn();

const fetchLobbySettings = vi.fn();
const saveLobbySettings = vi.fn();

vi.mock('../../services/api', async () => {
  return {
    fetchLobbySettings: (...args: unknown[]) => fetchLobbySettings(...args),
    saveLobbySettings: (...args: unknown[]) => saveLobbySettings(...args),
  };
});

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    setGameState,
    currentTheme: {
      bg: '',
      card: '',
      textMain: '',
      button: '',
      iconColor: '',
      isDark: true,
    },
    settings: {
      general: {
        language: 'UA',
        scoreToWin: 30,
        skipPenalty: true,
        categories: ['General'],
        // Device-only prefs that must NOT be synced by LobbySettingsScreen
        theme: 'PREMIUM_DARK',
        soundEnabled: true,
        soundPreset: 'FUN',
      },
      mode: { gameMode: 'CLASSIC', classicRoundTime: 60 },
    },
  }),
}));

describe('LobbySettingsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads saved lobby settings and saves filtered general fields (without theme/sound prefs)', async () => {
    const user = userEvent.setup();
    fetchLobbySettings.mockResolvedValueOnce({
      general: { scoreToWin: 40 },
      mode: { classicRoundTime: 90 },
    });
    saveLobbySettings.mockResolvedValueOnce(undefined);

    render(<LobbySettingsScreen />);

    // Wait for loading spinner to disappear and UI to render
    await waitFor(() => {
      expect(fetchLobbySettings).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Налаштування лоббі')).toBeVisible();
    });

    await user.click(screen.getByRole('button', { name: 'Зберегти як стандартні' }));

    expect(saveLobbySettings).toHaveBeenCalledTimes(1);
    const arg = saveLobbySettings.mock.calls[0][0] as Partial<GameSettings> | undefined;
    expect(arg?.general?.theme).toBeUndefined();
    expect(arg?.general?.soundEnabled).toBeUndefined();
    expect(arg?.general?.soundPreset).toBeUndefined();
    // but still contains real lobby settings
    expect(arg?.general?.scoreToWin).toBe(40);
    expect(
      arg?.mode && 'classicRoundTime' in arg.mode ? arg.mode.classicRoundTime : undefined
    ).toBe(90);
  });
});
