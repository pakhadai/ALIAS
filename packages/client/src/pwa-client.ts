import { registerSW } from 'virtual:pwa-register';

let reloadSw: ((reloadPage?: boolean) => Promise<void>) | undefined;

/**
 * Call once from each entry (main + admin) so the SW controls the origin.
 * Uses registerType: "prompt" — new deployments fire `pwa:need-refresh`.
 */
export function setupPwaRegister(): void {
  if (!('serviceWorker' in navigator)) return;
  reloadSw = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('pwa:need-refresh'));
    },
  });
}

/**
 * Activates the waiting worker (`SKIP_WAITING`) then asks the PWA runtime to reload.
 * `reloadSw(true)` normally performs `location.reload()`; the SW install path only
 * calls `skipWaiting` after this message so open tabs are not swapped mid-socket session.
 */
export async function applyPwaUpdate(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  } catch {
    /* ignore */
  }
  void reloadSw?.(true);
}
