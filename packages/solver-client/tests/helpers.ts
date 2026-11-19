// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PassThrough } from 'stream';
import { ChildProcess } from 'child_process';
import { zDerivedFile, type DerivedFile, type SolverScenario } from '@takt/contracts';

/** Identifiants UUID déterministes (jamais de v4 aléatoire dans les specs). */
const UUID = {
  generation: '11111111-1111-1111-1111-111111111111',
  version: '22222222-2222-2222-2222-222222222222',
  dept: '55555555-5555-5555-5555-555555555555',
  room: '33333333-3333-3333-3333-333333333333',
  teacher: '44444444-4444-4444-4444-444444444444',
  group: '66666666-6666-6666-6666-666666666666',
  subject: '77777777-7777-7777-7777-777777777777',
  activity: '88888888-8888-8888-8888-888888888888',
} as const;

/** Construit un DerivedFile valide et déterministe. */
export function makeDerivedFile(overrides: Partial<DerivedFile['metadata']> = {}): DerivedFile {
  const base: unknown = {
    metadata: {
      generationId: UUID.generation,
      versionId: UUID.version,
      semestre: '1',
      createdAt: '2026-01-01T00:00:00Z',
      timeSlotMinutes: 30,
      days: 6,
      slotsPerDay: 24,
      ...overrides,
    },
    timeGrid: {
      totalSlots: 144,
      slotDurationMinutes: 30,
      dayLabels: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      slotLabels: ['08:00'],
    },
    rooms: [
      {
        id: UUID.room,
        code: 'S101',
        type: 'AMPHI',
        capacity: 100,
        building: 'B1',
        equipment: [],
      },
    ],
    teachers: [
      {
        id: UUID.teacher,
        code: 'T1',
        name: 'Professeur',
        departmentId: UUID.dept,
        maxHoursPerWeek: 20,
        unavailableSlots: [],
      },
    ],
    groups: [
      { id: UUID.group, code: 'G1', size: 30, departmentId: UUID.dept },
    ],
    subjects: [
      {
        id: UUID.subject,
        code: 'M1',
        name: 'Mathématiques',
        departmentId: UUID.dept,
        teachingType: 'CM',
        chargeCoefficient: 1.0,
      },
    ],
    activities: [
      {
        id: UUID.activity,
        subjectId: UUID.subject,
        teacherIds: [UUID.teacher],
        groupIds: [UUID.group],
        roomType: 'AMPHI',
        durationSlots: 2,
        weeklyVolume: 1,
        teachingType: 'CM',
      },
    ],
    constraints: [],
    locks: [],
  };
  return zDerivedFile.parse(base);
}

/** Scénario de sortie valide et déterministe. */
export function makeScenario(overrides: Partial<SolverScenario> = {}): SolverScenario {
  return {
    id: '99999999-9999-9999-9999-999999999999',
    generationId: UUID.generation,
    score: 85,
    subScores: {
      coverage: 90,
      timeslotRespect: 80,
      roomRespect: 85,
      teacherRespect: 75,
      continuity: 88,
      loadBalance: 82,
    },
    placements: [
      {
        activityId: UUID.activity,
        day: 0,
        slot: 2,
        roomId: UUID.room,
        teacherId: UUID.teacher,
      },
    ],
    unplacedActivities: [],
    status: 'OPTIMAL',
    createdAt: '2026-01-01T01:00:00Z',
    ...overrides,
  };
}

/** Fichier de sortie enveloppe valide. */
export function makeValidOutput(scenarios: SolverScenario[] = [makeScenario()]): string {
  return JSON.stringify({ scenarios });
}

/**
 * Double de `child_process.spawn`.
 * Retourne un faux ChildProcess qui écrit `stdout`/`stderr` puis émet 'close'.
 * `capturedEnv` reçoit l'environnement transmis (pour les tests d'isolation).
 */
export function makeFakeSpawn(options: {
  stdout: string;
  stderr?: string;
  exitCode?: number;
  signal?: string;
  closeDelay?: number;
  capturedEnv?: { env: Record<string, string> | null };
  capturedChild?: { cp: unknown };
  capturedCommand?: { cmd: string | null };
  capturedArgs?: { args: string[] | null };
  killThrows?: boolean;
  killCalls?: number[];
}): typeof spawn {
  return ((_command: string, _args: unknown[], spawnOptions?: { env?: Record<string, string> }) => {
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const killCalls = options.killCalls ?? [];
    let closed = false;

    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const cp = {
      stdout,
      stderr,
      on: (event: string, listener: (...args: unknown[]) => void) => {
        (listeners[event] ??= []).push(listener);
        if (event === 'close' && !closed) {
          setTimeout(() => {
            closed = true;
            listener(options.exitCode, options.signal ?? null);
          }, options.closeDelay ?? 5);
        }
        return cp;
      },
      kill: () => {
        killCalls.push(1);
        if (options.killThrows) {
          throw new Error('kill failed');
        }
      },
      pid: 42,
      emit: (event: string, ...args: unknown[]) => {
        for (const fn of listeners[event] ?? []) {
          fn(...args);
        }
      },
    } as unknown as ChildProcess & {
      emit: (event: string, ...args: unknown[]) => void;
    };

    if (options.capturedChild) {
      options.capturedChild.cp = cp;
    }
    if (options.capturedCommand) {
      options.capturedCommand.cmd = _command;
    }
    if (options.capturedArgs) {
      options.capturedArgs.args = [...((_args as unknown) as string[])];
    }

    if (spawnOptions?.env && options.capturedEnv) {
      options.capturedEnv.env = { ...spawnOptions.env };
    }

    stdout.end(options.stdout);
    if (options.stderr !== undefined) {
      stderr.end(options.stderr);
    } else {
      stderr.end();
    }

    return cp;
  }) as typeof spawn;
}
