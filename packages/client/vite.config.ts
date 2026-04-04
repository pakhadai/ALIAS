import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html'),
      },
    },
  },
});
