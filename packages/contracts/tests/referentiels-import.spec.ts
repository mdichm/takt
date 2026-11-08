// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from 'vitest';
import {
  zTypeReferentielImportable,
  zImportReferentielCsv,
  zImportReferentielCsvConfirme,
  zErreurLigneImport,
  zApercuImport,
  zRapportImport,
  ENTETES_CSV_PAR_TYPE,
} from '../src/referentiels';

describe('zTypeReferentielImportable (L04-07)', () => {
  test.each(['site', 'type-salle', 'equipement', 'salle', 'groupe', 'enseignant'] as const)(
    'accepte le type %s',
    (type) => {
      expect(zTypeReferentielImportable.safeParse(type).success).toBe(true);
    },
  );

  test('refuse un type inconnu', () => {
    expect(zTypeReferentielImportable.safeParse('departement').success).toBe(false);
    expect(zTypeReferentielImportable.safeParse('SALLE').success).toBe(false);
  });
});

describe('ENTETES_CSV_PAR_TYPE (L04-07)', () => {
  test('définit les en-têtes attendus pour chaque type', () => {
    expect(ENTETES_CSV_PAR_TYPE.site).toEqual(['code', 'libelle']);
    expect(ENTETES_CSV_PAR_TYPE['type-salle']).toEqual(['code', 'libelle']);
    expect(ENTETES_CSV_PAR_TYPE.equipement).toEqual(['code', 'libelle']);
    expect(ENTETES_CSV_PAR_TYPE.salle).toEqual([
      'code',
      'libelle',
      'typesalle',
      'capacite',
      'site',
    ]);
    expect(ENTETES_CSV_PAR_TYPE.groupe).toEqual(['code', 'libelle', 'niveau']);
    expect(ENTETES_CSV_PAR_TYPE.enseignant).toEqual([
      'matricule',
      'nom',
      'prenom',
      'email',
      'grade',
      'actif',
    ]);
  });
});

describe('zImportReferentielCsv (L04-07)', () => {
  test('accepte un payload valide', () => {
    const resultat = zImportReferentielCsv.safeParse({
      type: 'site',
      contenu: 'code;libelle\nS1;Site 1\n',
    });
    expect(resultat.success).toBe(true);
  });

  test('refuse le contenu vide', () => {
    const resultat = zImportReferentielCsv.safeParse({
      type: 'site',
      contenu: '',
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]!.message).toBe('Le fichier CSV est vide');
    }
  });

  test('refuse un contenu supérieur à 2 Mo', () => {
    const resultat = zImportReferentielCsv.safeParse({
      type: 'site',
      contenu: 'x'.repeat(2_000_001),
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]!.message).toBe('Le fichier dépasse 2 Mo');
    }
  });
});

describe('zImportReferentielCsvConfirme (L04-07)', () => {
  test('accepte une empreinte SHA-256 valide', () => {
    const empreinte = 'a'.repeat(64);
    const resultat = zImportReferentielCsvConfirme.safeParse({
      type: 'site',
      contenu: 'code;libelle\nS1;Site 1\n',
      empreinte,
    });
    expect(resultat.success).toBe(true);
  });

  test('refuse une empreinte invalide', () => {
    const resultat = zImportReferentielCsvConfirme.safeParse({
      type: 'site',
      contenu: 'code;libelle\nS1;Site 1\n',
      empreinte: 'pas-une-empreinte',
    });
    expect(resultat.success).toBe(false);
  });
});

describe('zErreurLigneImport (L04-07)', () => {
  test('accepte une erreur de ligne complète', () => {
    const resultat = zErreurLigneImport.safeParse({
      ligne: 5,
      champ: 'code',
      valeur: 'DOUBLON',
      motif: 'Ce code est déjà utilisé',
    });
    expect(resultat.success).toBe(true);
  });

  test('refuse un numéro de ligne invalide', () => {
    const resultat = zErreurLigneImport.safeParse({
      ligne: 0,
      champ: 'code',
      valeur: 'X',
      motif: 'Erreur',
    });
    expect(resultat.success).toBe(false);
  });

  test('refuse un champ vide', () => {
    const resultat = zErreurLigneImport.safeParse({
      ligne: 1,
      champ: '',
      valeur: 'X',
      motif: 'Erreur',
    });
    expect(resultat.success).toBe(false);
  });
});

describe('zApercuImport et zRapportImport (L04-07)', () => {
  test('zApercuImport accepte un aperçu complet', () => {
    const resultat = zApercuImport.safeParse({
      type: 'salle',
      empreinte: 'b'.repeat(64),
      totalLignes: 100,
      lignesValides: 97,
      lignesInvalides: 3,
      erreurs: [
        {
          ligne: 10,
          champ: 'site',
          valeur: 'INE',
          motif: 'Le site "INE" n\'existe pas',
        },
      ],
      apercuLignes: [{ ligne: 1, code: 'S001', libelle: 'Salle 1' }],
    });
    expect(resultat.success).toBe(true);
  });

  test('zRapportImport accepte un rapport complet', () => {
    const resultat = zRapportImport.safeParse({
      type: 'enseignant',
      empreinte: 'c'.repeat(64),
      importes: 397,
      rejets: 3,
      erreurs: [
        {
          ligne: 42,
          champ: 'email',
          valeur: 'toto',
          motif: 'Adresse e-mail invalide',
        },
      ],
    });
    expect(resultat.success).toBe(true);
  });
});
