import { useCallback } from 'react';
import { playSoundEffect } from '../utils/audio';
import type { GameSettings, GameSoundId } from '../types';

export const useAudio = (settings: GameSettings) => {
  const play = useCallback(
    (type: GameSoundId) => {
      if (settings.soundEnabled) {
        playSoundEffect(type, settings.soundPreset);
      }
    },
    [settings.soundEnabled, settings.soundPreset]
  );

  return { play };
};
