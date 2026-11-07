// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from 'vitest';
import { analyserCsv } from './csv-parser';

describe('analyserCsv — séparateur (L04-07)', () => {
  test('séparateur point-virgule standard', () => {
    const resultat = analyserCsv('code;libelle\nS1;Site 1\nS2;Site 2\n');
    expect(resultat.entetes).toEqual(['code', 'libelle']);
    expect(resultat.lignes).toHaveLength(2);
    expect(resultat.lignes[0]!).toMatchObject({
      numero: 2,
      valeurs: { code: 'S1', libelle: 'Site 1' },
    });
    expect(resultat.lignes[1]!).toMatchObject({
      numero: 3,
      valeurs: { code: 'S2', libelle: 'Site 2' },
    });
  });

  test('séparateur virgule détecté automatiquement', () => {
    const resultat = analyserCsv('code,libelle\nS1,Site 1\n');
    expect(resultat.entetes).toEqual(['code', 'libelle']);
    expect(resultat.lignes[0]!.valeurs).toEqual({ code: 'S1', libelle: 'Site 1' });
  });

  test('point-virgule prioritaire quand majoritaire sur la ligne', () => {
    const resultat = analyserCsv('code;libelle;note\nS1;Site 1;5\n');
    expect(resultat.entetes).toEqual(['code', 'libelle', 'note']);
    expect(resultat.lignes[0]!.valeurs).toEqual({ code: 'S1', libelle: 'Site 1', note: '5' });
  });
});

describe('analyserCsv — encodage et sauts de ligne (L04-07)', () => {
  test('supprime le BOM UTF-8', () => {
    const resultat = analyserCsv('\uFEFFcode;libelle\nS1;Site 1\n');
    expect(resultat.entetes).toEqual(['code', 'libelle']);
    expect(resultat.lignes[0]!.valeurs.code).toBe('S1');
  });

  test('gère les sauts CRLF', () => {
    const resultat = analyserCsv('code;libelle\r\nS1;Site 1\r\n');
    expect(resultat.lignes).toHaveLength(1);
    expect(resultat.lignes[0]!.numero).toBe(2);
  });

  test('gère les sauts CR isolés', () => {
    const resultat = analyserCsv('code;libelle\rS1;Site 1\r');
    expect(resultat.lignes).toHaveLength(1);
  });

  test('fichier sans saut de ligne final', () => {
    const resultat = analyserCsv('code;libelle\nS1;Site 1');
    expect(resultat.lignes).toHaveLength(1);
    expect(resultat.lignes[0]!.valeurs.code).toBe('S1');
  });
});

describe('analyserCsv — guillemets (L04-07)', () => {
  test('champ entouré de guillemets', () => {
    const resultat = analyserCsv('code;libelle\nS1;"Site 1"\n');
    expect(resultat.lignes[0]!.valeurs.libelle).toBe('Site 1');
  });

  test('échappement des guillemets doubles ""', () => {
    const resultat = analyserCsv('code;libelle\nS1;"Site ""principal"""\n');
    expect(resultat.lignes[0]!.valeurs.libelle).toBe('Site "principal"');
  });

  test('champ multiligne (retour à la ligne dans des guillemets)', () => {
    const resultat = analyserCsv('code;libelle\nS1;"Ligne 1\nLigne 2"\nS2;Site 2\n');
    expect(resultat.lignes).toHaveLength(2);
    expect(resultat.lignes[0]!.numero).toBe(2);
    expect(resultat.lignes[0]!.valeurs.libelle).toBe('Ligne 1\nLigne 2');
    expect(resultat.lignes[1]!.numero).toBe(4);
    expect(resultat.lignes[1]!.valeurs.code).toBe('S2');
  });

  test('séparateur à l\'intérieur de guillemets conservé', () => {
    const resultat = analyserCsv('code;libelle\nS1;"A; B"\n');
    expect(resultat.lignes[0]!.valeurs.libelle).toBe('A; B');
  });
});

describe('analyserCsv — normalisation des en-têtes (L04-07)', () => {
  test('trim, minuscules et suppression des accents', () => {
    const resultat = analyserCsv(' Code ; Libellé \nS1;Site 1\n');
    expect(resultat.entetes).toEqual(['code', 'libelle']);
  });

  test('en-têtes avec espaces internes', () => {
    const resultat = analyserCsv('Type de salle;Capacité\nAmphi;200\n');
    expect(resultat.entetes).toEqual(['type de salle', 'capacite']);
  });
});

describe('analyserCsv — cas limites (L04-07)', () => {
  test('fichier vide', () => {
    const resultat = analyserCsv('');
    expect(resultat.entetes).toEqual([]);
    expect(resultat.lignes).toEqual([]);
  });

  test('uniquement des en-têtes, pas de données', () => {
    const resultat = analyserCsv('code;libelle\n');
    expect(resultat.entetes).toEqual(['code', 'libelle']);
    expect(resultat.lignes).toEqual([]);
  });

  test('ligne vide en fin de fichier ignorée', () => {
    const resultat = analyserCsv('code;libelle\nS1;Site 1\n\n');
    expect(resultat.lignes).toHaveLength(1);
  });

  test('numéro de ligne réel : en-tête = ligne 1', () => {
    const resultat = analyserCsv('code;libelle\nS1;Site 1\nS2;Site 2\n');
    expect(resultat.lignes[0]!.numero).toBe(2);
    expect(resultat.lignes[1]!.numero).toBe(3);
  });

  test('champs manquants en fin de ligne', () => {
    const resultat = analyserCsv('code;libelle\nS1\n');
    expect(resultat.lignes[0]!.valeurs.libelle).toBeUndefined();
  });
});
