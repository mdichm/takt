// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { calculerRatioContrastes, estConformeWCAG } from './contraste';
import { THEMES, SEUIL_CONTRASTE } from './tokens';

describe('ratio de contraste WCAG — valeurs de référence', () => {
  it('noir pur sur blanc pur = 21:1', () => {
    expect(calculerRatioContrastes('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('blanc pur sur noir pur = 21:1', () => {
    expect(calculerRatioContrastes('#FFFFFF', '#000000')).toBeCloseTo(21, 2);
  });

  it('gris médian sur blanc > 3:1', () => {
    expect(calculerRatioContrastes('#808080', '#FFFFFF')).toBeGreaterThan(3);
  });

  it('identique = 1:1', () => {
    expect(calculerRatioContrastes('#2563EB', '#2563EB')).toBeCloseTo(1, 2);
  });

  it('ratio est toujours >= 1', () => {
    expect(calculerRatioContrastes('#000000', '#FFFFFF')).toBeGreaterThanOrEqual(1);
    expect(calculerRatioContrastes('#FFFFFF', '#000000')).toBeGreaterThanOrEqual(1);
  });
});

describe('seuils WCAG par rôle', () => {
  it('texte-normal = 4.5, composant = 3', () => {
    expect(SEUIL_CONTRASTE['texte-normal']).toBe(4.5);
    expect(SEUIL_CONTRASTE.composant).toBe(3);
  });
});

describe('conformité AA sur les deux thèmes', () => {
  // Codes de couleurs qui sont des fonds ou des séparateurs décoratifs :
  // ce ne sont pas des paires texte/fond critiques de SPEC_ACCESSIBILITE §4.
  const CODES_FONDS = new Set([
    'DT-COLOR-05', // Surface
    'DT-COLOR-06', // Surface variant
    'DT-COLOR-07', // Background
    'DT-COLOR-10', // Text disabled (exempté, indicateur d'état)
    'DT-COLOR-11', // Border (séparateur décoratif)
    'DT-COLOR-12', // Divider (séparateur décoratif)
    'DT-COLOR-31', // Surface Ramadan
  ]);

  it.each(THEMES)('thème %s : 0 paire texte/fond non conforme', (theme) => {
    let pairesTestees = 0;
    const pairesNonConformes: string[] = [];

    for (const couleur of theme.couleurs) {
      if (CODES_FONDS.has(couleur.code)) {
        continue;
      }
      const seuil = SEUIL_CONTRASTE[couleur.role];

      // Contrast sur le surface du thème
      const ratioSurface = calculerRatioContrastes(couleur.valeur, theme.fonds.surface);
      if (!estConformeWCAG(ratioSurface, seuil)) {
        pairesNonConformes.push(
          `${couleur.code} ${couleur.nom} sur surface (${ratioSurface.toFixed(2)} < ${seuil})`,
        );
      }
      pairesTestees += 1;

      // Contrast sur le background du thème
      const ratioBackground = calculerRatioContrastes(couleur.valeur, theme.fonds.background);
      if (!estConformeWCAG(ratioBackground, seuil)) {
        pairesNonConformes.push(
          `${couleur.code} ${couleur.nom} sur background (${ratioBackground.toFixed(2)} < ${seuil})`,
        );
      }
      pairesTestees += 1;
    }

    console.log(`Thème ${theme.nom}: ${pairesTestees} paires testées`);
    if (pairesNonConformes.length > 0) {
      console.log(`Paires non conformes (${theme.nom}):`, pairesNonConformes.join(', '));
    }
    expect(pairesNonConformes).toEqual([]);
  });
});
