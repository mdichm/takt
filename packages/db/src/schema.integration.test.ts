// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CHEMIN_SCHEMA = resolve(process.cwd(), 'prisma/schema.prisma');
const CHEMIN_CONTRAT = resolve(process.cwd(), 'prisma/contract.prisma');
const CHEMIN_ARCHIVE = resolve(process.cwd(), '../../docs/archives/contract.prisma');

const MODELES_HISTORIQUES = [
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

// Modèles ajoutés après la matérialisation du contrat E0.5 (TAKT-L05-05).
const MODELES_DERIVES = ['ValidationRepartition', 'Notification'];

describe('Schéma Prisma exécutable', () => {
  it('est le schéma source de vérité unique (contract.prisma archivé)', () => {
    expect(existsSync(CHEMIN_SCHEMA)).toBe(true);
    // L'ancien contrat E0.5 n'est plus à l'emplacement exécutable.
    expect(existsSync(CHEMIN_CONTRAT)).toBe(false);
    // L'archive existe et porte le bandeau ARCHIVÉ.
    expect(existsSync(CHEMIN_ARCHIVE)).toBe(true);
    const archive = readFileSync(CHEMIN_ARCHIVE, 'utf8');
    expect(archive).toContain('ARCHIVÉ (DL-09)');
    expect(archive).toContain('schéma exécutable unique');
  });

  it('contient les 15 modèles historiques du contrat E0.5', () => {
    const schema = readFileSync(CHEMIN_SCHEMA, 'utf8');
    for (const modele of MODELES_HISTORIQUES) {
      expect(schema).toContain(`model ${modele}`);
    }
  });

  it('contient les modèles dérivés post-E0.5 (TAKT-L05-05)', () => {
    const schema = readFileSync(CHEMIN_SCHEMA, 'utf8');
    for (const modele of MODELES_DERIVES) {
      expect(schema).toContain(`model ${modele}`);
    }
  });

  it('ne déclare pas l’URL dans le schéma Prisma', () => {
    const schema = readFileSync(CHEMIN_SCHEMA, 'utf8');
    expect(schema).not.toMatch(/url\s*=\s*env\(/);
  });
});
