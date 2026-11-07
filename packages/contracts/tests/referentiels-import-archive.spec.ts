// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from 'vitest';
import {
  zTypeImportArchive,
  zStatutLigneArchive,
  zLigneApercuArchive,
  zApercuImportArchiveParams,
  zImportArchiveApercu,
  zImportArchiveConfirme,
  zParTypeImportArchive,
  zRapportImportArchive,
} from '../src/referentiels';

const EMPREINTE = '0'.repeat(64);

describe('zTypeImportArchive (L04-08)', () => {
  test.each([
    'parcours',
    'groupe',
    'matiere',
    'module',
    'salle',
  ] as const)('accepte le type %s', (type) => {
    expect(zTypeImportArchive.safeParse(type).success).toBe(true);
  });

  test('refuse un type inconnu', () => {
    expect(zTypeImportArchive.safeParse('seance').success).toBe(false);
    expect(zTypeImportArchive.safeParse('PARCOURS').success).toBe(false);
    expect(zTypeImportArchive.safeParse('').success).toBe(false);
  });
});

describe('zStatutLigneArchive (L04-08)', () => {
  test.each(['aImporter', 'dejaImporte', 'rejete'] as const)('accepte le statut %s', (statut) => {
    expect(zStatutLigneArchive.safeParse(statut).success).toBe(true);
  });

  test('refuse un statut invalide', () => {
    expect(zStatutLigneArchive.safeParse('a_import').success).toBe(false);
  });
});

describe('zLigneApercuArchive (L04-08)', () => {
  test('accepte une ligne complète à importer', () => {
    const resultat = zLigneApercuArchive.safeParse({
      type: 'salle',
      code: 'S001-2023',
      libelle: 'Salle 101',
      statut: 'aImporter',
      originId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(resultat.success).toBe(true);
  });

  test('refuse un statut invalide', () => {
    const resultat = zLigneApercuArchive.safeParse({
      type: 'salle',
      code: 'S001-2023',
      statut: 'inconnu',
    });
    expect(resultat.success).toBe(false);
  });

  test('refuse un code vide', () => {
    const resultat = zLigneApercuArchive.safeParse({
      type: 'salle',
      code: '',
      statut: 'aImporter',
    });
    expect(resultat.success).toBe(false);
  });
});

describe('zApercuImportArchiveParams (L04-08)', () => {
  test('accepte des paramètres valides', () => {
    const resultat = zApercuImportArchiveParams.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: ['parcours', 'salle'],
    });
    expect(resultat.success).toBe(true);
  });

  test('refuse un tableau de types vide', () => {
    const resultat = zApercuImportArchiveParams.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: [],
    });
    expect(resultat.success).toBe(false);
  });

  test('refuse un uuid invalide', () => {
    const resultat = zApercuImportArchiveParams.safeParse({
      anneeSourceId: 'pas-un-uuid',
      types: ['salle'],
    });
    expect(resultat.success).toBe(false);
  });
});

describe('zImportArchiveApercu (L04-08)', () => {
  test('accepte un aperçu complet', () => {
    const resultat = zImportArchiveApercu.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: ['salle'],
      empreinte: EMPREINTE,
      totalLignes: 5,
      lignesValides: 4,
      lignesInvalides: 0,
      dejaImports: 1,
      apercuLignes: [
        {
          type: 'salle',
          code: 'S001-2023',
          libelle: 'Salle 101',
          statut: 'aImporter',
          originId: '550e8400-e29b-41d4-a716-446655440001',
        },
        {
          type: 'salle',
          code: 'S002-2023',
          libelle: 'Salle 102',
          statut: 'dejaImporte',
          originId: '550e8400-e29b-41d4-a716-446655440002',
        },
      ],
    });
    expect(resultat.success).toBe(true);
  });

  test('refuse une empreinte invalide', () => {
    const resultat = zImportArchiveApercu.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: ['salle'],
      empreinte: 'pas-une-empreinte',
      totalLignes: 1,
      lignesValides: 1,
      lignesInvalides: 0,
      dejaImports: 0,
      apercuLignes: [],
    });
    expect(resultat.success).toBe(false);
  });
});

describe('zImportArchiveConfirme (L04-08)', () => {
  test('accepte une confirmation valide', () => {
    const resultat = zImportArchiveConfirme.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: ['salle'],
      empreinte: EMPREINTE,
    });
    expect(resultat.success).toBe(true);
  });

  test('refuse un tableau de types vide', () => {
    const resultat = zImportArchiveConfirme.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: [],
      empreinte: EMPREINTE,
    });
    expect(resultat.success).toBe(false);
  });
});

describe('zParTypeImportArchive (L04-08)', () => {
  test('accepte un détail par type complet', () => {
    const resultat = zParTypeImportArchive.safeParse({
      type: 'salle',
      importes: 3,
      dejaImports: 1,
      rejets: 1,
    });
    expect(resultat.success).toBe(true);
  });
});

describe('zRapportImportArchive (L04-08)', () => {
  test('accepte un rapport complet', () => {
    const resultat = zRapportImportArchive.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: ['salle'],
      empreinte: EMPREINTE,
      totalLignes: 5,
      importes: 3,
      dejaImports: 1,
      rejets: 1,
      erreurs: [
        {
          ligne: 4,
          champ: 'code',
          valeur: 'DOUBLON-2023',
          motif: 'Ce code est déjà utilisé dans le fichier',
        },
      ],
      parType: [
        { type: 'salle', importes: 3, dejaImports: 1, rejets: 1 },
      ],
    });
    expect(resultat.success).toBe(true);
  });

  test('accepte un rapport sans erreur', () => {
    const resultat = zRapportImportArchive.safeParse({
      anneeSourceId: '550e8400-e29b-41d4-a716-446655440000',
      types: ['salle'],
      empreinte: EMPREINTE,
      totalLignes: 3,
      importes: 3,
      dejaImports: 0,
      rejets: 0,
      erreurs: [],
      parType: [],
    });
    expect(resultat.success).toBe(true);
  });
});
