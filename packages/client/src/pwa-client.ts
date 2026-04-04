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

export function applyPwaUpdate(): void {
  void reloadSw?.(true);
}
