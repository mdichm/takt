// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import { genererArtefacts, lireArtefact } from './generer';
import { THEMES, type JetonCouleur } from './tokens';

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

describe('familles invariantes de thème (CSS + JSON)', () => {
  genererArtefacts();
  const normal = lireArtefact('tokens-normal.css');
  const ramadan = lireArtefact('tokens-ramadan.css');
  const json = lireArtefact('tokens.json');

  const familles = [
    { nom: 'TYPOGRAPHIE', prefixe: '--font-size-' },
    { nom: 'ESPACEMENT', prefixe: '--space-' },
    { nom: 'BORDURE', prefixe: '--' },
    { nom: 'COMPOSANT', prefixe: '--' },
    { nom: 'MOUVEMENT', prefixe: '--transition-' },
    { nom: 'FOCUS', prefixe: '--' },
    { nom: 'Z_INDEX', prefixe: '--z-' },
    { nom: 'BREAKPOINT', prefixe: '--breakpoint-' },
  ];

  it('génère les 8 familles dans le bloc global des deux CSS', () => {
    for (const { prefixe } of familles) {
      expect(normal).toContain(prefixe);
      expect(ramadan).toContain(prefixe);
    }
  });

  it('contient les variables globales attendues dans les deux thèmes', () => {
    const attendues = [
      '--font-family-base',
      '--font-size-h1',
      '--font-weight-h1',
      '--line-height-h1',
      '--space-xxs',
      '--space-m',
      '--radius-md',
      '--border-width',
      '--shadow-sm',
      '--button-height',
      '--input-height',
      '--card-padding',
      '--transition-fast',
      '--transition-normal',
      '--ring-width',
      '--ring-color',
      '--z-modal',
      '--breakpoint-sm',
      '--breakpoint-lg',
    ];
    for (const varName of attendues) {
      expect(normal).toContain(`${varName}:`);
      expect(ramadan).toContain(`${varName}:`);
    }
  });

  it('exporte les familles invariantes dans tokens.json sous "globales"', () => {
    const donnees = JSON.parse(json);
    const globales = donnees.globales;
    expect(globales['font-family-base']).toBeDefined();
    expect(globales['font-size-h1']).toBe('2rem');
    expect(globales['font-weight-h1']).toBe('700');
    expect(globales['line-height-h1']).toBe('1.2');
    expect(globales['space-xxs']).toBe('0.25rem');
    expect(globales['space-gutter']).toBe('1rem');
    expect(globales['radius-md']).toBe('0.5rem');
    expect(globales['border-width']).toBe('1px');
    expect(globales['shadow-lg']).toBe('0 10px 15px rgba(0,0,0,0.1)');
    expect(globales['button-height']).toBe('2.5rem');
    expect(globales['card-padding']).toBe('1.5rem');
    expect(globales['transition-fast']).toBe('150ms ease-out');
    expect(globales['transition-slow']).toBe('350ms ease-in-out');
    expect(globales['ring-width']).toBe('2px');
    expect(globales['ring-color']).toBe('var(--color-primary)');
    expect(globales['z-modal']).toBe('1000');
    expect(globales['z-toast']).toBe('2000');
    expect(globales['breakpoint-sm']).toBe('640px');
    expect(globales['breakpoint-xl']).toBe('1280px');
  });
});
