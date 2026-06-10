import { useEffect } from 'react';

type DeviceOrientationEventWithPermission = DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState | string>;
};

/**
 * Live glass sheen via DeviceOrientation — activates only after the first user gesture (iOS 13+).
 * Writes `--gyro-x` / `--gyro-y` on `<html>`; throttled to display refresh via rAF.
 */
export function useGyroscope(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;
    let listenerAttached = false;

    const flush = () => {
      rafId = 0;
      document.documentElement.style.setProperty('--gyro-x', String(pendingX));
      document.documentElement.style.setProperty('--gyro-y', String(pendingY));
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      pendingX = (event.gamma ?? 0) / 30;
      pendingY = (event.beta ?? 0) / 60;
      if (rafId === 0) {
        rafId = requestAnimationFrame(flush);
      }
    };

    const initGyroEffect = () => {
      if (listenerAttached) return;
      listenerAttached = true;
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
    };

    const activateGyroscope = () => {
      const ctor = DeviceOrientationEvent as unknown as DeviceOrientationEventWithPermission;
      if (typeof ctor.requestPermission === 'function') {
        void ctor
          .requestPermission()
          .then((state) => {
            if (state === 'granted') initGyroEffect();
          })
          .catch(() => {
            /* permission denied — no-op */
          });
        return;
      }
      initGyroEffect();
    };

    document.addEventListener('click', activateGyroscope, { once: true });
    document.addEventListener('touchstart', activateGyroscope, { once: true, passive: true });

    return () => {
      document.removeEventListener('click', activateGyroscope);
      document.removeEventListener('touchstart', activateGyroscope);
      window.removeEventListener('deviceorientation', onOrientation);
      if (rafId !== 0) cancelAnimationFrame(rafId);
    };
  }, [enabled]);
}
