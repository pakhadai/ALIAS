type VibratePattern = number | number[];

const PREFS_KEY = 'alias_preferences';

function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function isHapticsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return true; // default on
    const prefs = JSON.parse(raw);
    return prefs?.hapticsEnabled !== false;
  } catch {
    return true;
  }
}

export function vibrate(pattern: VibratePattern): void {
  if (!isVibrationSupported()) return;
  if (!isHapticsEnabled()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

export const HAPTIC = {
  nav: 10,
  correct: [30, 50, 30] as number[],
  skip: 50,
  timeUp: [100, 50, 100, 50, 200] as number[],
} as const;

