// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { SolverError } from '../src/errors';

describe('SolverError', () => {
  it('conserve cause, details et durationMs', () => {
    const cause = new Error('solver crash');
    const err = new SolverError('SOLVER_CRASH', 'boom', {
      durationMs: 42,
      details: { exitCode: 1, stderr: 'nope', peakRssMb: 1024 },
      cause,
    });

    expect(err.name).toBe('SolverError');
    expect(err.type).toBe('SOLVER_CRASH');
    expect(err.message).toBe('boom');
    expect(err.durationMs).toBe(42);
    expect(err.details.peakRssMb).toBe(1024);
    expect(err.cause).toBe(cause);
  });

  it('définit des valeurs par défaut quand options est omis', () => {
    const err = new SolverError('TIMEOUT', 'trop long');

    expect(err.type).toBe('TIMEOUT');
    expect(err.durationMs).toBe(0);
    expect(err.details).toEqual({});
    expect(err.cause).toBeUndefined();
  });
});
