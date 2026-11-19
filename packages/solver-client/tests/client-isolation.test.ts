// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { SolverClient } from '../src/client';
import { makeDerivedFile, makeFakeSpawn } from './helpers';

describe('SolverClient (isolation du sous-processus, GG-10)', () => {
  it('ne transmet aucune variable de connexion base de données', async () => {
    const capturedEnv: { env: Record<string, string> | null } = { env: null };
    const spawnFn = makeFakeSpawn({
      stdout: JSON.stringify({ scenarios: [] }),
      exitCode: 0,
      capturedEnv,
    });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });

    const previous = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      await client.solve(makeDerivedFile());
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }

    const env = capturedEnv.env;
    expect(env).not.toBeNull();
    expect(env!.DATABASE_URL).toBeUndefined();
    // Variables canoniques du solveur présentes
    expect(env!.DERIVED_FILE_PATH).toBeDefined();
    expect(env!.OUTPUT_PATH).toBeDefined();
    expect(env!.TIMEOUT_SEC).toBeDefined();
    expect(env!.MAX_SCENARIOS).toBeDefined();
  });

  it('exclut aussi PG*, JWT_* et REDIS_URL', async () => {
    const capturedEnv: { env: Record<string, string> | null } = { env: null };
    const spawnFn = makeFakeSpawn({
      stdout: JSON.stringify({ scenarios: [] }),
      exitCode: 0,
      capturedEnv,
    });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });

    const saved: Record<string, string | undefined> = {};
    for (const key of ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'JWT_SECRET', 'REDIS_URL']) {
      saved[key] = process.env[key];
    }
    try {
      for (const key of Object.keys(saved)) process.env[key] = 'secret-value';
      await client.solve(makeDerivedFile());
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }

    const env = capturedEnv.env!;
    for (const key of ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'JWT_SECRET', 'REDIS_URL']) {
      expect(env[key]).toBeUndefined();
    }
  });
});
