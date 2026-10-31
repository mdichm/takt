import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./src/test-setup.integration.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@takt/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@takt/db': path.resolve(__dirname, '../../packages/db'),
      '@takt/solver-client': path.resolve(__dirname, '../../packages/solver-client/src'),
    },
  },
});