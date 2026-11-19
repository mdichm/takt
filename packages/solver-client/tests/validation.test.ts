
// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { parseSolverOutput } from '../src/validation';
import { makeScenario, makeValidOutput } from './helpers';
import { SolverError } from '../src/errors';
import { zSolverScenario } from '@takt/contracts';

function expectInvalidOutput(fn: () => unknown) {
  try {
    fn();
    throw new Error("aurait dû lever INVALID_OUTPUT");
  } catch (err) {
    expect(err).toBeInstanceOf(SolverError);
    expect((err as SolverError).type).toBe('INVALID_OUTPUT');
  }
}

describe('parseSolverOutput', () => {
  it('retourne les scénarios depuis une enveloppe valide', () => {
    const scenarios = [makeScenario(), makeScenario({ score: 60 })];
    const result = parseSolverOutput(JSON.stringify({ scenarios }));
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(85);
    expect(result[1].score).toBe(60);
  });

  it('accepte un tableau brut de scénarios', () => {
    const scenarios = [makeScenario()];
    const result = parseSolverOutput(JSON.stringify(scenarios));
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('OPTIMAL');
  });

  it('accepte une enveloppe avec zéro scénario', () => {
    const result = parseSolverOutput(JSON.stringify({ scenarios: [] }));
    expect(result).toEqual([]);
  });

  it('lève INVALID_OUTPUT sur du JSON invalide', () => {
    expectInvalidOutput(() => parseSolverOutput('not json'));
  });

  it('lève INVALID_OUTPUT quand le score dépasse 100', () => {
    expectInvalidOutput(() =>
      parseSolverOutput(JSON.stringify({ scenarios: [makeScenario({ score: 101 })] })),
    );
  });

  it('lève INVALID_OUTPUT quand le score est négatif', () => {
    expectInvalidOutput(() =>
      parseSolverOutput(JSON.stringify({ scenarios: [makeScenario({ score: -1 })] })),
    );
  });

  it('lève INVALID_OUTPUT quand il y a plus de 3 scénarios', () => {
    const scenarios = Array.from({ length: 4 }, () => makeScenario());
    expectInvalidOutput(() => parseSolverOutput(JSON.stringify({ scenarios })));
  });

  it('lève INVALID_OUTPUT quand un champ requis manque', () => {
    const bad = { ...makeScenario(), id: undefined as unknown as string };
    expectInvalidOutput(() => parseSolverOutput(JSON.stringify({ scenarios: [bad] })));
  });

  it('lève INVALID_OUTPUT pour un format non reconnu', () => {
    expectInvalidOutput(() => parseSolverOutput(JSON.stringify({ truc: 'bidon' })));
  });

  it("détaille les issues Zod dans une erreur INVALID_OUTPUT", () => {
    try {
      parseSolverOutput(JSON.stringify({ scenarios: [makeScenario({ score: 999 })] }));
      throw new Error('aurait dû lever');
    } catch (err) {
      expect(err).toBeInstanceOf(SolverError);
      expect((err as SolverError).details.zodIssues).toBeDefined();
      expect((err as SolverError).details.zodIssues!.length).toBeGreaterThan(0);
    }
  });

  it('valide le statut des scénarios via le schéma partagé', () => {
    const s = zSolverScenario.parse(makeScenario({ status: 'INFEASIBLE' }));
    expect(s.status).toBe('INFEASIBLE');
  });

  it('lève INVALID_OUTPUT pour un tableau contenant un item invalide', () => {
    const bad = [{ ...makeScenario(), score: 999 }];
    expectInvalidOutput(() => parseSolverOutput(JSON.stringify(bad)));
  });
});
