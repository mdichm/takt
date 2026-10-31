import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    // Les tests d'intégration sont exécutés par `pnpm test:integration`
    // (vitest.integration.config.ts) avec la base de données de test.
    exclude: [...configDefaults.exclude, 'src/**/*.integration.test.ts'],
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