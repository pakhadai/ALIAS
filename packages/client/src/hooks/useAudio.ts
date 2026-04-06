import { useCallback } from 'react';
import { playSoundEffect } from '../utils/audio';
import type { GameSettings, GameSoundId } from '../types';

export const useAudio = (settings: GameSettings) => {
  const play = useCallback(
    (type: GameSoundId) => {
      if (settings.general.soundEnabled) {
        playSoundEffect(type, settings.general.soundPreset);
      }
    },
    [settings.general.soundEnabled, settings.general.soundPreset]
  );

  return { play };
};
