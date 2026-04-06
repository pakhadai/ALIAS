const PREFS_KEY = 'alias_preferences';

export type VibratePattern = number | number[];

function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function getHapticsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return true; // default on
    const prefs = JSON.parse(raw);
    return prefs?.hapticsEnabled !== false;
  } catch {
    return true;
  }
}

export function setHapticsEnabled(next: boolean): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, hapticsEnabled: next }));
  } catch {
    // ignore
  }
}

export function vibrate(pattern: VibratePattern): void {
  if (!isVibrationSupported()) return;
  if (!getHapticsEnabled()) return;
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
  quizCorrect: [40, 30, 40] as number[],
  quizWrong: [80] as number[],
} as const;
