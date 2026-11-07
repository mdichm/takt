// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['prisma/**/*.integration.test.ts', 'src/**/*.test.ts'],
    testTimeout: 30_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    setupFiles: ['./test/setup-integration.ts'],
  },
});
