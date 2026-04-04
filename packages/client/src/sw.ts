/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

const NOTIFY_ICON = '/icons/icon-192.svg';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** Google Fonts + Material Symbols (same as legacy sw.js). */
registerRoute(
  ({ url }) =>
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'alias-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

async function navigateWithOfflineFallback(request: Request): Promise<Response> {
  const url = new URL(request.url);
  try {
    const res = await fetch(request);
    if (res.ok) return res;
  } catch {
    /* offline or network error */
  }
  const offline = await caches.match('/offline.html');
  const path = url.pathname;
  if (path === '/admin' || path.startsWith('/admin/')) {
    return (await caches.match('/admin.html')) ?? offline ?? offlineResponse();
  }
  return (await caches.match('/index.html')) ?? offline ?? offlineResponse();
}

function offlineResponse(): Response {
  return new Response('Offline', { status: 503, statusText: 'Offline' });
}

registerRoute(
  ({ request, url }) => {
    if (request.method !== 'GET') return false;
    if (request.mode !== 'navigate') return false;
    if (url.origin !== self.location.origin) return false;
    if (url.href.includes('peerjs')) return false;
    return true;
  },
  ({ request }) => navigateWithOfflineFallback(request)
);

// ─── Push (preserved from public/sw.js) ───────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const notifOptions: NotificationOptions & { vibrate?: number[] } = {
    body: data.body || '',
    icon: NOTIFY_ICON,
    badge: NOTIFY_ICON,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(data.title || 'ALIAS', notifOptions));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
