import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

/** PWA theme = main menu / premium dark shell (#1A1A1A). */
const PWA_THEME = '#1A1A1A';

/**
 * Icons: until real PNGs exist, SVG entries satisfy install prompts on many browsers.
 * For production polish on Android (maskable) and iOS (apple-touch-icon), add:
 *   - public/icons/pwa-192.png   (192×192, "any")
 *   - public/icons/pwa-512.png   (512×512, "any")
 *   - public/icons/pwa-512-maskable.png (512×512, safe zone ~40% center — "maskable")
 * Then point `icons` below to those files. See docs/PWA-ICONS.md.
 */
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();

export default defineConfig({
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
        name: 'Alias Master',
        short_name: 'Alias',
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
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon-192.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
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
    // Ensure HMR websocket binds to localhost on the expected port
    host: 'localhost',
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Resolve shared from source so dev/HMR works without a prior shared build.
      // App code must still import via the package name: `from '@alias/shared'`.
      '@alias/shared': path.resolve(__dirname, '../shared/src/index.ts'),
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
