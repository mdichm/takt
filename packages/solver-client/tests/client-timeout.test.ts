// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { SolverClient } from '../src/client';
import { makeDerivedFile, makeFakeSpawn } from './helpers';

describe('SolverClient (timeout)', () => {
  it('lève TIMEOUT et tue le processus quand le solveur dépasse le timeout', async () => {
    const killCalls: number[] = [];
    // Le sous-processus ne se termine jamais (aucun événement 'close' simulé)
    const spawnFn = makeFakeSpawn({
      stdout: '',
      killCalls,
    });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
      timeoutMs: 50, // timeout très court pour le test
    });

    await expect(client.solve(makeDerivedFile())).rejects.toMatchObject({
      name: 'SolverError',
      type: 'TIMEOUT',
    });

    // Le processus a été tué (SIGTERM puis SIGKILL)
    expect(killCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('envoie un SIGKILL de grâce peu après le timeout', async () => {
    const killCalls: number[] = [];
    const spawnFn = makeFakeSpawn({ stdout: '', killCalls, killThrows: true });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
      timeoutMs: 50,
      graceMs: 20,
    });
    await expect(client.solve(makeDerivedFile())).rejects.toMatchObject({
      type: 'TIMEOUT',
    });
    // Le délai de grâce (20 ms) a envoyé le SIGKILL entre-temps
    await new Promise((r) => setTimeout(r, 60));
    expect(killCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('fermeture avec signal uniquement (code null) → TIMEOUT', async () => {
    const spawnFn = makeFakeSpawn({ stdout: '', exitCode: undefined, signal: 'SIGTERM' });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
      timeoutMs: 500,
    });
    await expect(client.solve(makeDerivedFile())).rejects.toMatchObject({
      type: 'TIMEOUT',
    });
  });
});
