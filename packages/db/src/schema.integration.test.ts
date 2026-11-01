// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CHEMIN_SCHEMA = resolve(process.cwd(), 'prisma/schema.prisma');
const CHEMIN_CONTRAT = resolve(process.cwd(), 'prisma/contract.prisma');

describe('Schéma Prisma exécutable', () => {
  it('expose un schéma dérivé du contrat avec les 15 modèles attendus', () => {
    expect(existsSync(CHEMIN_SCHEMA)).toBe(true);

    const schema = readFileSync(CHEMIN_SCHEMA, 'utf8');
    const contrat = readFileSync(CHEMIN_CONTRAT, 'utf8');
    const modelesAttendus = [
      'Utilisateur',
      'Role',
      'Departement',
      'AnneeUniversitaire',
      'Semestre',
      'Version',
      'Snapshot',
      'AffectationPedagogique',
      'Seance',
      'VerrouSeance',
      'Contrainte',
      'Generation',
      'Scenario',
      'Export',
      'JournalAudit',
    ];

    for (const modele of modelesAttendus) {
      expect(schema).toContain(`model ${modele}`);
      expect(contrat).toContain(`model ${modele}`);
    }
  });

  it('ne déclare pas l’URL dans le schéma Prisma 7', () => {
    const schema = readFileSync(CHEMIN_SCHEMA, 'utf8');
    expect(schema).not.toMatch(/url\s*=\s*env\(/);
  });
});
