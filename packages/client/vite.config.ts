import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import dotenv from 'dotenv';
import path from 'path';

const monorepoRoot = path.resolve(__dirname, '..', '..');
const envProdPath = path.join(monorepoRoot, '.env.prod');
if (existsSync(envProdPath)) {
  dotenv.config({ path: envProdPath });
}

/** Shown in the main menu; must stay in sync with nothing else — this is the only source. */
const APP_VERSION = (
  JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8')) as { version: string }
).version;

/** PWA theme = main menu / premium dark shell (#1A1A1A). */
const PWA_THEME = '#1A1A1A';

/**
 * Icons synced from repo `logo/` via scripts/sync-logo.mjs:
 *   - favicon.ico (128×128 round mark)
 *   - icons/favicon-32.png, apple-touch-icon.png (180×180)
 *   - icons/pwa-192.png, icons/pwa-512.png
 * See docs/PWA-ICONS.md.
 */
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();

/** E2E / local override: `VITE_SERVER_URL` sets dev proxy target (see `packages/e2e/playwright.config.ts`). */
const devProxyTarget = (process.env.VITE_SERVER_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const devPort = parseInt(process.env.VITE_DEV_PORT || '5173', 10);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  // Repo root: same `.env.prod` as server + optional Vite `.env.*` overrides
  envDir: monorepoRoot,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        id: '/',
        name: 'MOVLI Master',
        short_name: 'MOVLI',
        description: 'The ultimate party game for teams.',
        theme_color: PWA_THEME,
        background_color: PWA_THEME,
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'uk',
        icons: [
          {
            src: '/icons/favicon-32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/favicon.ico',
            sizes: '128x128',
            type: 'image/x-icon',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,json,webmanifest}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
    ...(sentryAuthToken
      ? sentryVitePlugin({
          org: process.env.SENTRY_ORG ?? '',
          project: process.env.SENTRY_PROJECT ?? '',
          authToken: sentryAuthToken,
          telemetry: false,
        })
      : []),
  ],
  server: {
    headers: {
      // Allow Google OAuth popup to postMessage back to parent window
      'Cross-Origin-Opener-Policy': 'unsafe-none',
    },
    // Same-origin API + Socket.IO in dev (mirrors nginx gateway in prod). Without this,
    // getApiBaseUrl() → window.location.origin sends sockets to Vite HMR, not the game server.
    proxy: {
      '/api': { target: devProxyTarget, changeOrigin: true },
      '/socket.io': { target: devProxyTarget, ws: true },
      '/health': { target: devProxyTarget, changeOrigin: true },
    },
    // Fail fast if the dev port is taken — avoids silent drift to another port.
    strictPort: true,
    // Ensure HMR websocket binds to localhost on the expected port
    host: 'localhost',
    port: devPort,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: devPort,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve shared from source so dev/HMR works without a prior shared build.
      // App code must still import via the package name: `from '@movli/shared'`.
      '@movli/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  publicDir: 'public',
  build: {
    sourcemap: sentryAuthToken ? 'hidden' : false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
    },
  },
});
