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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
