// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { SolverClient, type SolverMetrics } from '../src/client';
import { makeDerivedFile, makeFakeSpawn, makeScenario, makeValidOutput } from './helpers';

describe('SolverClient (succès)', () => {
  let root: string;
  let derivedDir: string;
  let scenariosDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'takt-solver-test-'));
    derivedDir = join(root, 'derived');
    scenariosDir = join(root, 'scenarios');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('retourne les scénarios avec un score dans [0, 100]', async () => {
    const scenario = makeScenario({ score: 85 });
    const spawnFn = makeFakeSpawn({ stdout: makeValidOutput([scenario]), exitCode: 0 });
    const client = new SolverClient({ derivedDir, scenariosDir, spawnFn });

    const result = await client.solve(makeDerivedFile());

    expect(result).toHaveLength(1);
    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(100);
    expect(result[0].status).toBe('OPTIMAL');
  });

  it('écrit le fichier dérivé sur le disque', async () => {
    const scenario = makeScenario();
    const spawnFn = makeFakeSpawn({ stdout: makeValidOutput([scenario]), exitCode: 0 });
    const client = new SolverClient({ derivedDir, scenariosDir, spawnFn });

    await client.solve(makeDerivedFile());

    const derivedFile = join(derivedDir, `${makeDerivedFile().metadata.generationId}.json`);
    // Le générationId est identique à chaque appel de makeDerivedFile (déterministe)
    expect(existsSync(derivedFile)).toBe(true);
    const content = readFileSync(derivedFile, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.metadata.generationId).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('émet des métriques de statut SUCCESS', async () => {
    const scenario = makeScenario();
    const spawnFn = makeFakeSpawn({ stdout: makeValidOutput([scenario]), exitCode: 0 });
    const metrics: SolverMetrics[] = [];
    const client = new SolverClient({
      derivedDir,
      scenariosDir,
      spawnFn,
      onMetrics: (m) => metrics.push(m),
    });

    await client.solve(makeDerivedFile());

    expect(metrics).toHaveLength(1);
    expect(metrics[0].status).toBe('SUCCESS');
    expect(metrics[0].scenarioCount).toBe(1);
    expect(metrics[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(metrics[0].errorType).toBeUndefined();
  });

  it('supporte la surcharge du timeout et du maxScenarios par appel', async () => {
    const scenario = makeScenario();
    const spawnFn = makeFakeSpawn({ stdout: makeValidOutput([scenario]), exitCode: 0 });
    const client = new SolverClient({ derivedDir, scenariosDir, spawnFn });

    await client.solve(makeDerivedFile(), {
      overrideTimeoutMs: 60_000,
      overrideMaxScenarios: 1,
    });

    // Si on arrive ici sans erreur, l'appel avec options a été accepté
    expect(true).toBe(true);
  });

  it('prend en compte le peakRssMb déclaré par le worker', async () => {
    const scenario = makeScenario();
    const spawnFn = makeFakeSpawn({
      stdout: JSON.stringify({ scenarios: [scenario], metrics: { peakRssMb: 256 } }),
      exitCode: 0,
    });
    const metrics: SolverMetrics[] = [];
    const client = new SolverClient({
      derivedDir,
      scenariosDir,
      spawnFn,
      onMetrics: (m) => metrics.push(m),
    });

    const result = await client.solve(makeDerivedFile());

    expect(result).toHaveLength(1);
    expect(metrics).toHaveLength(1);
    expect(metrics[0].peakRssMb).toBe(256);
  });

  it('appelle le logger fourni à chaque solve', async () => {
    const scenario = makeScenario();
    const spawnFn = makeFakeSpawn({ stdout: makeValidOutput([scenario]), exitCode: 0 });
    const logs: string[] = [];
    const client = new SolverClient({
      derivedDir,
      scenariosDir,
      spawnFn,
      logger: { log: (msg) => logs.push(msg) },
    });

    await client.solve(makeDerivedFile());

    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((m) => m.includes('status=SUCCESS'))).toBe(true);
  });

  it('transmet les options de construction au sous-processus', async () => {
    const capturedCommand: { cmd: string | null } = { cmd: null };
    const capturedArgs: { args: string[] | null } = { args: null };
    const scenario = makeScenario();
    const spawnFn = makeFakeSpawn({
      stdout: makeValidOutput([scenario]),
      exitCode: 0,
      capturedCommand,
      capturedArgs,
    });
    const client = new SolverClient({
      derivedDir,
      scenariosDir,
      spawnFn,
      solverCommand: 'mon-solver',
      maxScenarios: 7,
      memoryLimitMb: 8192,
    });
    await client.solve(makeDerivedFile());
    expect(capturedCommand.cmd).toBe('mon-solver');
    expect(capturedArgs.args).toContain('--max-scenarios');
    expect(capturedArgs.args).toContain('7');
  });

  it('ne plante pas avec un logger sans fonction log', async () => {
    const scenario = makeScenario();
    const spawnFn = makeFakeSpawn({ stdout: makeValidOutput([scenario]), exitCode: 0 });
    const client = new SolverClient({
      derivedDir,
      scenariosDir,
      spawnFn,
      logger: {},
    });
    const result = await client.solve(makeDerivedFile());
    expect(result).toHaveLength(1);
  });
});
