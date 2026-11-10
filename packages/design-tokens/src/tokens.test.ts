// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  THEMES,
  SEUIL_CONTRASTE,
  TYPOGRAPHIE,
  ESPACEMENT,
  BORDURE,
  COMPOSANT,
  MOUVEMENT,
  FOCUS,
  Z_INDEX,
  BREAKPOINT,
  type JetonCouleur,
  type JetonTypographie,
  type JetonSimple,
} from './tokens';

describe('jetons de couleur (source de vérité)', () => {
  it('chaque couleur a un code DT-COLOR-XX unique par thème', () => {
    for (const theme of THEMES) {
      const codes = theme.couleurs.map((c) => c.code);
      expect(new Set(codes).size).toBe(codes.length);
      for (const c of theme.couleurs) {
        expect(c.code).toMatch(/^DT-COLOR-\d{2}$/);
        expect(c.valeur).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(c.role).toBeDefined();
      }
    }
  });

  it('les seuils de contraste sont cohérents', () => {
    expect(SEUIL_CONTRASTE['texte-normal']).toBe(4.5);
    expect(SEUIL_CONTRASTE.composant).toBe(3);
  });

  it('expose le type JetonCouleur', () => {
    const jeton: JetonCouleur = {
      code: 'DT-COLOR-01',
      nom: 'Primary',
      valeur: '#2563EB',
      usage: 'test',
      role: 'composant',
    };
    expect(jeton.code).toBe('DT-COLOR-01');
  });
});

describe('familles invariantes de thème', () => {
  const familles: { nom: string; jetons: readonly JetonSimple[] }[] = [
    { nom: 'ESPACEMENT', jetons: ESPACEMENT },
    { nom: 'BORDURE', jetons: BORDURE },
    { nom: 'COMPOSANT', jetons: COMPOSANT },
    { nom: 'MOUVEMENT', jetons: MOUVEMENT },
    { nom: 'FOCUS', jetons: FOCUS },
    { nom: 'Z_INDEX', jetons: Z_INDEX },
    { nom: 'BREAKPOINT', jetons: BREAKPOINT },
  ];

  it.each(familles)('famille %s : codes uniques, format DT-*, valeurs non vides', ({ jetons }) => {
    const codes = jetons.map((j) => j.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const j of jetons) {
      expect(j.code).toMatch(/^DT-[A-Z]+-\d{2}$/);
      expect(j.nom.length).toBeGreaterThan(0);
      expect(j.valeur.length).toBeGreaterThan(0);
      expect(j.usage.length).toBeGreaterThan(0);
    }
  });

  it('TYPOGRAPHIE : 8 jetons, codes uniques, graisses > 0, interlignages > 0', () => {
    const codes = TYPOGRAPHIE.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(TYPOGRAPHIE.length).toBe(8);
    for (const t of TYPOGRAPHIE) {
      expect(t.code).toMatch(/^DT-TYPO-\d{2}$/);
      expect(t.nom.length).toBeGreaterThan(0);
      expect(t.taille.length).toBeGreaterThan(0);
      expect(t.graisse).toBeGreaterThan(0);
      expect(t.interlignage).toBeGreaterThan(0);
      expect(t.usage.length).toBeGreaterThan(0);
    }
  });

  it('chaque famille est typée correctement', () => {
    const simple: JetonSimple = ESPACEMENT[0]!;
    expect(simple.code).toBeDefined();
    const typo: JetonTypographie = TYPOGRAPHIE[0]!;
    expect(typo.graisse).toBeDefined();
    expect(typo.interlignage).toBeDefined();
  });
});
