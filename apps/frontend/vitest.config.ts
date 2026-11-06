// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@takt/contracts': resolve(__dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 75,
        branches: 75,
        functions: 75,
        statements: 75,
      },
      exclude: [
        'src/main.tsx',
        'src/test/**',
        '*.config.ts',
        'vitest.config.ts',
        '**/*.test.*',
        '**/*.d.ts',
        'e2e/**',
        'dist/**',
      ],
    },
  },
});
