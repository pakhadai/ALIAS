import { useCallback } from 'react';
import { vibrate, type VibratePattern } from '../utils/haptics';

/**
 * Stable callback for haptic feedback (respects prefs + navigator.vibrate in vibrate()).
 */
export function useHapticFeedback() {
  return useCallback((pattern: VibratePattern) => {
    vibrate(pattern);
  }, []);
}
