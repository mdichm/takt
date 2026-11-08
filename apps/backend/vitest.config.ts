// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
    testTimeout: 10_000,
  },
});
