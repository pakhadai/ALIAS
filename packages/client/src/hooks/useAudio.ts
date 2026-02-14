
import { useCallback } from 'react';
import { playSoundEffect } from '../utils/audio';
import { GameSettings } from '../types';

export const useAudio = (settings: GameSettings) => {
  const play = useCallback((type: 'correct' | 'skip' | 'start' | 'end' | 'tick' | 'win') => {
    if (settings.soundEnabled) {
      playSoundEffect(type, settings.soundPreset);
    }
  }, [settings.soundEnabled, settings.soundPreset]);

  return { play };
};
