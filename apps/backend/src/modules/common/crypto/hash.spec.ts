// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { creerHashSHA256, verifierHashSHA256 } from './hash';

describe('creerHashSHA256 (intégrité des snapshots)', () => {
  it('produit le même hash pour une même entrée (déterminisme)', () => {
    const donnees = { versionId: 'v1', departementId: 'd1', type: 'REPARTITION' };
    const h1 = creerHashSHA256(donnees);
    const h2 = creerHashSHA256(donnees);
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });

  it('ignore l\'ordre des clés d\'objet de premier niveau', () => {
    const h1 = creerHashSHA256({ a: 1, b: 2 });
    const h2 = creerHashSHA256({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it('trie récursivement les clés des objets imbriqués', () => {
    const h1 = creerHashSHA256({ z: { b: 2, a: 1 }, y: 3 });
    const h2 = creerHashSHA256({ y: 3, z: { a: 1, b: 2 } });
    expect(h1).toBe(h2);
  });

  it('produit des hash différents pour des données différentes', () => {
    const h1 = creerHashSHA256({ foo: 'bar' });
    const h2 = creerHashSHA256({ foo: 'baz' });
    expect(h1).not.toBe(h2);
  });

  it('gère les tableaux de façon déterministe', () => {
    const h1 = creerHashSHA256({ items: [3, 1, 2] });
    const h2 = creerHashSHA256({ items: [3, 1, 2] });
    const h3 = creerHashSHA256({ items: [1, 2, 3] });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('gère null et undefined', () => {
    const hNull = creerHashSHA256(null);
    const hUndefined = creerHashSHA256(undefined);
    expect(hNull).toBe(creerHashSHA256(null));
    expect(hUndefined).toBe(creerHashSHA256(undefined));
    expect(hNull).not.toBe(hUndefined);
  });
});

describe('verifierHashSHA256', () => {
  it('retourne true quand le hash correspond', () => {
    const donnees = { x: 1 };
    const hash = creerHashSHA256(donnees);
    expect(verifierHashSHA256(donnees, hash)).toBe(true);
  });

  it('retourne false quand le hash ne correspond pas', () => {
    expect(verifierHashSHA256({ x: 1 }, '0000000000000000000000000000000000000000000000000000000000000000')).toBe(false);
  });
});