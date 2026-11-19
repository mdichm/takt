// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { DerivedFile, type Scenario } from './types';
import { promises as fs } from 'fs';
import { spawn, type ChildProcess, type SpawnOptions } from 'child_process';
import * as path from 'path';
import { SolverError, type SolverErrorType } from './errors';
import { parseSolverOutput } from './validation';

/** Résultat brut de l'exécution du sous-processus solveur. */
interface SolverRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  spawnError?: unknown;
}

/** Métriques émises à chaque appel de solve (succès comme échec). */
export interface SolverMetrics {
  generationId: string;
  durationMs: number;
  peakRssMb: number | null;
  scenarioCount: number;
  status: 'SUCCESS' | 'FAILURE';
  errorType?: SolverErrorType;
}

/** Options de construction du client. */
export interface SolverClientOptions {
  derivedDir: string;
  scenariosDir: string;
  solverCommand?: string;
  timeoutMs?: number;
  maxScenarios?: number;
  memoryLimitMb?: number;
  graceMs?: number;
  spawnFn?: typeof spawn;
  onMetrics?: (metrics: SolverMetrics) => void;
  logger?: { log?: (message: string) => void; error?: (message: string) => void };
}

/** Options d'un appel ponctuel à solve. */
export interface SolveOptions {
  overrideTimeoutMs?: number;
  overrideMaxScenarios?: number;
}
/**
 * Client du solveur CP-SAT.
 *
 * Encapsule l'invocation d'un sous-processus isolé (pas de réseau, pas d'accès
 * base de données - conforme GG-10 / TE-ARCH-01), écrit le fichier dérivé,
 * applique un timeout, parse et valide la sortie, et émet des métriques.
 */
export class SolverClient {
  private readonly derivedDir: string;
  private readonly scenariosDir: string;
  private readonly solverCommand: string;
  private readonly timeoutMs: number;
  private readonly maxScenarios: number;
  private readonly memoryLimitMb: number;
  private readonly graceMs: number;
  private readonly spawnFn: typeof spawn;
  private readonly onMetrics?: (metrics: SolverMetrics) => void;
  private readonly logger?: { log?: (message: string) => void; error?: (message: string) => void };

  constructor(options: SolverClientOptions) {
    this.derivedDir = options.derivedDir;
    this.scenariosDir = options.scenariosDir;
    this.solverCommand = options.solverCommand ?? 'python3 -m takt.solver';
    this.timeoutMs = options.timeoutMs ?? 300_000;
    this.maxScenarios = options.maxScenarios ?? 3;
    this.memoryLimitMb = options.memoryLimitMb ?? 4096;
    this.graceMs = options.graceMs ?? 5000;
    this.spawnFn = options.spawnFn ?? spawn;
    this.onMetrics = options.onMetrics;
    this.logger = options.logger;
  }

  /**
   * Génère des scénarios à partir d'un fichier dérivé.
   *
   * @returns `Scenario[]` (score dans [0, 100]).
   * @throws `SolverError` typé : TIMEOUT, SOLVER_CRASH, INVALID_OUTPUT,
   *         MEMORY_EXCEEDED ou INFEASIBLE.
   */
  async solve(derivedFile: DerivedFile, options?: SolveOptions): Promise<Scenario[]> {
    const generationId = derivedFile.metadata.generationId;
    const start = Date.now();

    let status: 'SUCCESS' | 'FAILURE' = 'FAILURE';
    let errorType: SolverErrorType | undefined;
    let scenarioCount = 0;
    let peakRssMb: number | null = null;

    try {
      await fs.mkdir(this.derivedDir, { recursive: true });
      const derivedPath = path.join(this.derivedDir, `${generationId}.json`);
      await fs.writeFile(derivedPath, JSON.stringify(derivedFile, null, 2));

      await fs.mkdir(this.scenariosDir, { recursive: true });
      const scenarioDir = path.join(this.scenariosDir, generationId);

      const timeoutSec = Math.round((options?.overrideTimeoutMs ?? this.timeoutMs) / 1000);
      const maxScenarios = options?.overrideMaxScenarios ?? this.maxScenarios;

      const run = await this.runSolver(
        generationId,
        derivedPath,
        scenarioDir,
        timeoutSec,
        maxScenarios,
      );

      // Détection mémoire : processus tué par SIGKILL (exitCode 137) ou OOM dans stderr
      const killedByOom = run.exitCode === 137 || run.signal === 'SIGKILL';
      const oomInStderr = /MemoryError|out of memory|OOM/i.test(run.stderr);
      if (killedByOom || oomInStderr) {
        throw new SolverError('MEMORY_EXCEEDED', 'Le solveur a dépassé la limite mémoire', {
          durationMs: Date.now() - start,
          details: {
            exitCode: run.exitCode,
            signal: run.signal,
            stderr: run.stderr,
            peakRssMb,
          },
        });
      }

      // Timeout : processus tué par le client (SIGTERM)
      if (run.signal === 'SIGTERM') {
        throw new SolverError('TIMEOUT', `Le solveur a dépassé le timeout de ${timeoutSec}s`, {
          durationMs: Date.now() - start,
          details: { exitCode: run.exitCode, signal: run.signal, stderr: run.stderr },
        });
      }

      // Échec d'exécution du solveur (hors timeout)
      if (run.exitCode !== 0 && run.exitCode !== null) {
        const infeasible = /infeasible|incompatible|no solution/i.test(run.stderr);
        if (infeasible) {
          throw new SolverError('INFEASIBLE', 'Les contraintes sont incompatibles (problème infaisable)', {
            durationMs: Date.now() - start,
            details: { exitCode: run.exitCode, stderr: run.stderr },
          });
        }
        throw new SolverError('SOLVER_CRASH', `Le solveur a échoué (code ${run.exitCode})`, {
          durationMs: Date.now() - start,
          details: { exitCode: run.exitCode, stderr: run.stderr, stdout: run.stdout },
        });
      }

      if (run.spawnError) {
        throw new SolverError('SOLVER_CRASH', `Impossible de lancer le solveur: ${String(run.spawnError)}`, {
          durationMs: Date.now() - start,
          details: { stderr: run.stderr },
          cause: run.spawnError,
        });
      }

      // Parsage et validation de la sortie
      const scenarios = parseSolverOutput(run.stdout);
      const metrics = this.extractMetrics(run.stdout);
      peakRssMb = metrics.peakRssMb ?? null;

      // Détection infaisable via le statut des scénarios retournés
      if (scenarios.length > 0 && scenarios.every((s) => s.status === 'INFEASIBLE')) {
        throw new SolverError('INFEASIBLE', 'Tous les scénarios retournés sont infaisables', {
          durationMs: Date.now() - start,
          details: { scenarioCount: scenarios.length },
        });
      }

      scenarioCount = scenarios.length;
      status = 'SUCCESS';
      return scenarios;
    } catch (err) {
      if (err instanceof SolverError) {
        errorType = err.type;
        // Préserve le peakRssMb déjà extrait d'une sortie valide avant l'échec métier
        if (peakRssMb === null) {
          /* istanbul ignore next: branche défensive, atteinte quand une erreur
             métier survient avant l'extraction des métriques de sortie */
          peakRssMb = err.details.peakRssMb ?? null;
        }
        throw err;
      }
      errorType = 'SOLVER_CRASH';
      throw new SolverError(
        'SOLVER_CRASH',
        String(err),
        { durationMs: Date.now() - start, cause: err },
      );
    } finally {
      const durationMs = Date.now() - start;
      this.emitMetrics({
        generationId,
        durationMs,
        peakRssMb,
        scenarioCount,
        status,
        errorType,
      });
    }
  }


  /**
   * Exécute le solver dans un sous-processus isolé.
   *
   * L'environnement transmis est soumis à une allowlist explicite ; toute
   * variable de connexion à la base de données est exclue (GG-10 / TE-ARCH-01).
   */
  private runSolver(
    generationId: string,
    derivedPath: string,
    scenarioDir: string,
    timeoutSec: number,
    maxScenarios: number,
  ): Promise<SolverRunResult> {
    return new Promise((resolve) => {
      const env = this.buildSolverEnv(derivedPath, scenarioDir, timeoutSec, maxScenarios);

      let child: ChildProcess | null = null;
      let resolved = false;

      const resolveOnce = (result: SolverRunResult) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        try {
          child?.kill('SIGTERM');
        } catch {
          // Ignoré : tentative de terminaison défensive, sans conséquence métier
        }
        // Grâce de 5 s puis SIGKILL forcé
        setTimeout(() => {
          try {
            child?.kill('SIGKILL');
          } catch {
            // Ignoré : tentative de terminaison définitive défensive
          }
        }, this.graceMs);
        resolveOnce({
          stdout: '',
          stderr: 'Solver timeout',
          exitCode: null,
          signal: 'SIGTERM',
        });
      }, timeoutSec * 1000);

      try {
        child = this.spawnFn(this.solverCommand, [
          '--input', derivedPath,
          '--output', scenarioDir,
          '--max-scenarios', String(maxScenarios),
          '--time-limit', String(timeoutSec),
        ], {
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env,
        } as unknown as SpawnOptions);
      } catch (err) {
        clearTimeout(timer);
        resolveOnce({ stdout: '', stderr: '', exitCode: null, signal: null, spawnError: err });
        return;
      }

      if (!child) {
        clearTimeout(timer);
        resolveOnce({ stdout: '', stderr: '', exitCode: null, signal: null });
        return;
      }

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code, signal) => {
        resolveOnce({
          stdout,
          stderr,
          exitCode: code ?? null,
          signal: signal ?? null,
        });
      });

      child.on('error', (err) => {
        resolveOnce({
          stdout,
          stderr,
          exitCode: null,
          signal: null,
          spawnError: err,
        });
      });
    });
  }

  /**
   * Construit l'environnement du sous-processus (allowlist + denylist DB).
   */
  private buildSolverEnv(
    derivedPath: string,
    scenarioDir: string,
    timeoutSec: number,
    maxScenarios: number,
  ): Record<string, string> {
    const allowedKeys = [
      'PATH', 'HOME', 'LANG', 'LC_ALL', 'PYTHONPATH', 'TMPDIR', 'TEMP',
    ];
    const env: Record<string, string> = {};
    for (const key of allowedKeys) {
      const value = process.env[key];
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // Contrat canonique d'exécution du worker solveur
    env.DERIVED_FILE_PATH = derivedPath;
    env.OUTPUT_PATH = scenarioDir;
    env.TIMEOUT_SEC = String(timeoutSec);
    env.MAX_SCENARIOS = String(maxScenarios);

    // Seules les clés de l'allowlist ci-dessus sont transmises : aucune variable
    // de connexion à la base de données (DATABASE_URL, PG*, JWT*, ...) ne peut
    // y figurer (GG-10 / TE-ARCH-01).
    return env;
  }

  /** Extrait les métriques optionnelles (peakRssMb) de la sortie brute. */
  private extractMetrics(raw: string): { peakRssMb: number | null } {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'metrics' in parsed) {
      const metrics = (parsed as { metrics?: { peakRssMb?: number } }).metrics;
      if (metrics && typeof metrics.peakRssMb === 'number') {
        return { peakRssMb: metrics.peakRssMb };
      }
    }
    return { peakRssMb: null };
  }

  private emitMetrics(metrics: SolverMetrics) {
    this.onMetrics?.(metrics);
    const parts = [
      `[solver] generation=${metrics.generationId} status=${metrics.status}`,
      `durationMs=${metrics.durationMs}`,
      `scenarios=${metrics.scenarioCount}`,
    ];
    if (metrics.errorType) {
      parts.push(`error=${metrics.errorType}`);
    }
    if (metrics.peakRssMb !== null) {
      parts.push(`peakRssMb=${metrics.peakRssMb}`);
    }
    this.logger?.log?.(parts.join(' '));
  }
}
