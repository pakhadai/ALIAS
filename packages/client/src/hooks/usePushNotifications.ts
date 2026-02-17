import { useState, useEffect, useCallback } from 'react';
import { fetchVapidPublicKey, savePushSubscription, removePushSubscription } from '../services/api';

/** Convert base64url VAPID public key to Uint8Array for pushManager.subscribe */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function usePushNotifications() {
  const supported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  const [permission, setPermission] = useState<PushPermission>(
    supported ? (Notification.permission as PushPermission) : 'unsupported',
  );
  const [loading, setLoading] = useState(false);

  // Sync permission state when it changes externally
  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission as PushPermission);
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || loading) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const publicKey = await fetchVapidPublicKey();

      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await savePushSubscription(sub);
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, [supported, loading]);

  const unsubscribe = useCallback(async () => {
    if (!supported || loading) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setPermission('default');
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, [supported, loading]);

  return { permission, supported, loading, subscribe, unsubscribe };
}
