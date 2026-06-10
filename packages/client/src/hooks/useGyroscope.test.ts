import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGyroscope } from './useGyroscope';

describe('useGyroscope', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('--gyro-x');
    document.documentElement.style.removeProperty('--gyro-y');
  });

  it('should attach deviceorientation after first click on non-iOS browsers', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    renderHook(() => useGyroscope(true));

    await act(async () => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(addSpy).toHaveBeenCalledWith('deviceorientation', expect.any(Function), {
      passive: true,
    });
  });

  it('should write gyro CSS vars when orientation events fire', async () => {
    let orientationHandler: ((event: DeviceOrientationEvent) => void) | undefined;

    const addListener = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation(((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (type === 'deviceorientation' && typeof listener === 'function') {
        orientationHandler = listener as (event: DeviceOrientationEvent) => void;
      }
      addListener(type, listener, options);
    }) as typeof window.addEventListener);

    renderHook(() => useGyroscope(true));

    await act(async () => {
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      orientationHandler?.(
        new DeviceOrientationEvent('deviceorientation', { gamma: 30, beta: 60 })
      );
      await vi.runAllTimersAsync();
    });

    expect(document.documentElement.style.getPropertyValue('--gyro-x').trim()).toBe('1');
    expect(document.documentElement.style.getPropertyValue('--gyro-y').trim()).toBe('1');
  });
});
