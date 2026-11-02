// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analyserDependancesModules,
  analyserImportsSource,
  controlerDependancesBackend,
  detecterCyclesModules,
  MODULES_METIER_ATTENDUS,
} from './module-dependencies';

const GRAPHE_SIMPLE = {
  auth: ['common', 'users'],
  users: ['common', 'audit'],
  audit: ['common'],
  events: ['common', 'auth'],
};

describe('Analyse des dépendances entre modules backend', () => {
  it('exige les onze modules métier canoniques', () => {
    expect(MODULES_METIER_ATTENDUS).toEqual([
      'auth',
      'users',
      'referentiels',
      'repartition',
      'versions',
      'planning',
      'generation',
      'exports',
      'audit',
      'notifications',
      'events',
    ]);
  });

  it('refuse une dépendance entre modules qui ne figure pas dans la matrice', () => {
    const violations = analyserDependancesModules({
      planning: ['common', 'referentiels', 'versions', 'generation'],
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      moduleSource: 'planning',
      moduleCible: 'generation',
    });
  });

  it('refuse un cycle de dépendances', () => {
    const cycles = detecterCyclesModules({
      planning: ['versions'],
      versions: ['planning'],
    });

    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['planning', 'versions', 'planning']);
  });

  it('accepte le graphe canonique sans violation ni cycle', () => {
    expect(analyserDependancesModules(GRAPHE_SIMPLE)).toEqual([]);
    expect(detecterCyclesModules(GRAPHE_SIMPLE)).toEqual([]);
  });

  it('limite planning aux modules common, referentiels et versions', () => {
    expect(
      analyserDependancesModules({
        planning: ['common', 'referentiels', 'versions'],
      }),
    ).toEqual([]);
    expect(
      analyserDependancesModules({
        planning: ['common', 'referentiels', 'versions', 'generation'],
      }),
    ).toHaveLength(1);
  });

  it('valide le graphe réel du backend sans violation ni cycle', () => {
    const resultat = controlerDependancesBackend(resolve(__dirname, '../../../..'));

    expect(resultat.modulesManquants).toEqual([]);
    expect(resultat.violations).toEqual([]);
    expect(resultat.cycles).toEqual([]);
  });

  it('identifie un import relatif interdit et sa ligne', () => {
    const violations = analyserImportsSource(
      'planning',
      'src/modules/planning/planning.service.ts',
      [
        "import { ReferentielsModule } from '../referentiels/referentiels.module';",
        "import { GenerationModule } from '../generation/generation.module';",
      ].join('\n'),
    );

    expect(violations).toEqual([
      {
        moduleSource: 'planning',
        moduleCible: 'generation',
        fichier: 'src/modules/planning/planning.service.ts',
        ligne: 2,
      },
    ]);
  });

  it('refuse l’accès direct au sous-module Prisma', () => {
    const violations = analyserImportsSource(
      'users',
      'src/modules/users/users.service.ts',
      "import { PrismaService } from '../common/prisma/prisma.service';",
    );

    expect(violations).toEqual([
      {
        moduleSource: 'users',
        moduleCible: 'common/prisma',
        fichier: 'src/modules/users/users.service.ts',
        ligne: 1,
      },
    ]);
  });
});
