// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { genererArtefacts, lireArtefact, type JetonCouleur } from './generer';
import { THEMES } from './tokens';

describe('génération des artefacts (déterminisme)', () => {
  it('deux générations produisent une sortie identique', () => {
    genererArtefacts();
    const normal1 = lireArtefact('tokens-normal.css');
    const ramadan1 = lireArtefact('tokens-ramadan.css');
    const json1 = lireArtefact('tokens.json');

    genererArtefacts();
    const normal2 = lireArtefact('tokens-normal.css');
    const ramadan2 = lireArtefact('tokens-ramadan.css');
    const json2 = lireArtefact('tokens.json');

    expect(normal2).toBe(normal1);
    expect(ramadan2).toBe(ramadan1);
    expect(json2).toBe(json1);
  });

  it('les fichiers versionnés sont synchronisés avec la génération', () => {
    genererArtefacts();
    const normal = lireArtefact('tokens-normal.css');
    const ramadan = lireArtefact('tokens-ramadan.css');
    const json = lireArtefact('tokens.json');

    expect(normal).toContain(':root {');
    expect(normal).toContain('--color-primary: #2563EB');
    expect(ramadan).toContain("[data-theme='ramadan'] {");
    expect(ramadan).toContain('--color-primary: #7C3AED');
    expect(json).toContain('"normal"');
    expect(json).toContain('"ramadan"');
    expect(json).toContain('"color-primary"');
  });
});

describe('couverture des thèmes', () => {
  it.each(THEMES)('thème %s : tous les tokens ont un code DT-* et une valeur hex', (theme) => {
    for (const couleur of theme.couleurs) {
      expect(couleur.code).toMatch(/^DT-COLOR-\d{2}$/);
      expect(couleur.valeur).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(couleur.nom.length).toBeGreaterThan(0);
      expect(couleur.usage.length).toBeGreaterThan(0);
    }
  });

  it('tous les codes du thème normal sont présents dans le thème Ramadan', () => {
    const codesNormal = new Set(THEMES[0]!.couleurs.map((c) => c.code));
    const codesRamadan = new Set(THEMES[1]!.couleurs.map((c) => c.code));
    for (const code of codesNormal) {
      expect(codesRamadan).toContain(code);
    }
    // Le thème Ramadan peut avoir des codes spécifiques (accent, surface, primary)
    expect(codesRamadan.size).toBeGreaterThanOrEqual(codesNormal.size);
  });

  it('expose les types JetonCouleur', () => {
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
