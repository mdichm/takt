import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@takt/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@takt/design-tokens': path.resolve(__dirname, '../../packages/design-tokens/src'),
      '@takt/db': path.resolve(__dirname, '../../packages/db'),
      '@takt/solver-client': path.resolve(__dirname, '../../packages/solver-client/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/lib/test-setup.ts',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});