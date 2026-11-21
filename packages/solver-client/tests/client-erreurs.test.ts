// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'fs';
import { SolverClient, type SolverMetrics } from '../src/client';
import { SolverError } from '../src/errors';
import { makeDerivedFile, makeFakeSpawn, makeScenario, makeValidOutput } from './helpers';

function expectSolverErrorType(promise: Promise<unknown>, type: 'INVALID_OUTPUT' | 'SOLVER_CRASH' | 'MEMORY_EXCEEDED' | 'INFEASIBLE') {
  return expect(promise).rejects.toMatchObject({
    name: 'SolverError',
    type,
  } as SolverError);
}

describe('SolverClient (erreurs typées)', () => {
  it('INVALID_OUTPUT lorsque la sortie n\'est pas du JSON', async () => {
    const spawnFn = makeFakeSpawn({ stdout: 'not json', exitCode: 0 });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'INVALID_OUTPUT');
  });

  it('INVALID_OUTPUT lorsque la sortie ne respecte pas le contrat', async () => {
    const spawnFn = makeFakeSpawn({ stdout: JSON.stringify({ scenarios: [] }), exitCode: 0 });
    // scenarios: [] est valide ; pour forcer INVALID_OUTPUT, utilisons un score hors bornes
    const bad = JSON.stringify({ scenarios: [makeScenario({ score: 200 })] });
    const spawnFn2 = makeFakeSpawn({ stdout: bad, exitCode: 0 });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn: spawnFn2,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'INVALID_OUTPUT');
  });

  it('SOLVER_CRASH lorsque le solveur quitte avec un code non nul', async () => {
    const spawnFn = makeFakeSpawn({ stdout: makeValidOutput([makeScenario()]), exitCode: 1 });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'SOLVER_CRASH');
  });

  it('MEMORY_EXCEEDED lorsque le processus est tué par SIGKILL (exitCode 137)', async () => {
    const spawnFn = makeFakeSpawn({ stdout: '', exitCode: 137, signal: null });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'MEMORY_EXCEEDED');
  });

  it('INFEASIBLE lorsque le solver signale un problème infaisable sur stderr', async () => {
    const spawnFn = makeFakeSpawn({
      stdout: '',
      stderr: 'ERROR: constraints are infeasible, no solution',
      exitCode: 1,
    });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'INFEASIBLE');
  });

  it('SOLVER_CRASH lorsque le lancement du sous-processus échoue', async () => {
    const spawnFn = ((_cmd: string, _args: unknown[], _opts: unknown) => {
      throw new Error('EBUSY: cannot spawn solver');
    }) as typeof spawn;
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'SOLVER_CRASH');
  });

  it('émet des métriques de statut FAILURE en cas d\'erreur', async () => {
    const spawnFn = makeFakeSpawn({ stdout: 'not json', exitCode: 0 });
    const metrics: SolverMetrics[] = [];
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
      onMetrics: (m) => metrics.push(m),
    });

    await expect(client.solve(makeDerivedFile())).rejects.toBeInstanceOf(SolverError);

    expect(metrics).toHaveLength(1);
    expect(metrics[0].status).toBe('FAILURE');
    expect(metrics[0].errorType).toBe('INVALID_OUTPUT');
    expect(metrics[0].scenarioCount).toBe(0);
  });

  it('traite un spawnFn retournant null comme une erreur de lancement', async () => {
    const spawnFn = ((_cmd: string, _args: unknown[], _opts: unknown) => null) as typeof spawn;
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'INVALID_OUTPUT');
  });

  it('traite une erreur asynchrone du sous-processus comme SOLVER_CRASH', async () => {
    const capturedChild: { cp: unknown } = { cp: null as unknown };
    const spawnFn = makeFakeSpawn({ stdout: '', exitCode: 0, capturedChild });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    const promise = client.solve(makeDerivedFile());
    for (let i = 0; i < 200 && capturedChild.cp === null; i++) {
      await new Promise((r) => setTimeout(r, 1));
    }
    const cp = capturedChild.cp as { emit: (event: string, ...args: unknown[]) => void };
    cp.emit('error', new Error('ECONNREFUSED'));
    await expectSolverErrorType(promise, 'SOLVER_CRASH');
  });

  it('enveloppe toute erreur inattendue en SOLVER_CRASH (écriture dérivée impossible)', async () => {
    const badFile = '/tmp/takt-solver-client-badfile';
    try {
      writeFileSync(badFile, 'x');
    } catch {}
    const spawnFn = makeFakeSpawn({ stdout: '', exitCode: 0 });
    const client = new SolverClient({
      derivedDir: badFile + '/sous-repertoire',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'SOLVER_CRASH');
  });

  it('INFEASIBLE quand tous les scénarios retournés ont le statut INFEASIBLE', async () => {
    const spawnFn = makeFakeSpawn({
      stdout: JSON.stringify({ scenarios: [makeScenario({ status: 'INFEASIBLE' })] }),
      exitCode: 0,
    });
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'INFEASIBLE');
  });

  it('spawnFn absent : utilise spawn réel et échoue en SOLVER_CRASH', async () => {
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      // Aucun spawnFn : le client utilise child_process.spawn réel
      // (commande par défaut introuvable → erreur de lancement).
    });
    await expectSolverErrorType(client.solve(makeDerivedFile()), 'SOLVER_CRASH');
  });

  it('INFEASIBLE via scénarios avec peakRssMb déclaré (métrique d\'échec)', async () => {
    const spawnFn = makeFakeSpawn({
      stdout: JSON.stringify({
        scenarios: [makeScenario({ status: 'INFEASIBLE' })],
        metrics: { peakRssMb: 123 },
      }),
      exitCode: 0,
    });
    const metrics: SolverMetrics[] = [];
    const client = new SolverClient({
      derivedDir: '/tmp/derived',
      scenariosDir: '/tmp/scenarios',
      spawnFn,
      onMetrics: (m) => metrics.push(m),
    });
    await expect(client.solve(makeDerivedFile())).rejects.toMatchObject({ type: 'INFEASIBLE' });
    expect(metrics).toHaveLength(1);
    expect(metrics[0].errorType).toBe('INFEASIBLE');
    expect(metrics[0].peakRssMb).toBe(123);
  });
});
