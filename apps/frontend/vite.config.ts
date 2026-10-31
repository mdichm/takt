import { defineConfig, configDefaults } from 'vitest/config';
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
    // Les tests Playwright (e2e/) sont exécutés par `pnpm test:e2e`, pas par Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});