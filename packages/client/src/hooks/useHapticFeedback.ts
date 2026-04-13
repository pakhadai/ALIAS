import { useCallback, useMemo } from 'react';
import { vibrate, type VibratePattern } from '../utils/haptics';

/**
 * Stable callback for haptic feedback (respects prefs + navigator.vibrate in vibrate()).
 */
export function useHapticFeedback() {
  const impactOccurred = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    const tg = window.Telegram?.WebApp;
    const api = tg?.HapticFeedback;
    if (!api?.impactOccurred) return;
    try {
      api.impactOccurred(style);
    } catch {
      // ignore
    }
  }, []);

  const notificationOccurred = useCallback((type: 'success' | 'warning' | 'error') => {
    const tg = window.Telegram?.WebApp;
    const api = tg?.HapticFeedback;
    if (!api?.notificationOccurred) return;
    try {
      api.notificationOccurred(type);
    } catch {
      // ignore
    }
  }, []);

  const selectionChanged = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const api = tg?.HapticFeedback;
    if (!api?.selectionChanged) return;
    try {
      api.selectionChanged();
    } catch {
      // ignore
    }
  }, []);

  const pattern = useCallback((p: VibratePattern) => {
    vibrate(p);
  }, []);

  return useMemo(
    () => ({
      pattern,
      impactOccurred,
      notificationOccurred,
      selectionChanged,
    }),
    [impactOccurred, notificationOccurred, pattern, selectionChanged]
  );
}
