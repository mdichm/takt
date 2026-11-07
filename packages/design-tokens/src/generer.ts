// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  THEMES,
  TYPOGRAPHIE,
  ESPACEMENT,
  BORDURE,
  COMPOSANT,
  MOUVEMENT,
  FOCUS,
  Z_INDEX,
  BREAKPOINT,
} from './tokens.js';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const RACINE_PACKAGE = join(__dirname, '..');

/** Convertit un nom lisible en identifiant CSS (kebab-case, sans préfixe). */
function identifiantCSS(nom: string): string {
  return nom.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
}

/** Génère le contenu d'un fichier CSS pour un thème. */
function genererCSS(theme: (typeof THEMES)[number]): string {
  const lignes: string[] = [];
  lignes.push(`/* Thème ${theme.nom} — généré automatiquement à partir de src/tokens.ts */`);
  lignes.push(`/* Ne pas éditer manuellement : exécuter pnpm run generate */`);
  lignes.push('');

  const selecteur = theme.nom === 'normal' ? ':root' : `[data-theme='${theme.nom}']`;
  lignes.push(`${selecteur} {`);

  // Variables de couleur du thème (surcharges du thème écrasent les valeurs par défaut)
  for (const couleur of theme.couleurs) {
    lignes.push(`  --color-${identifiantCSS(couleur.nom)}: ${couleur.valeur};`);
  }

  // Variables globales (invariantes de thème, RB-DT-02, DL-DT-01)
  lignes.push('');
  lignes.push('  /* Variables globales */');
  lignes.push(`  --font-family-base: 'Inter', system-ui, sans-serif;`);

  // Typographie : 3 variables par jeton (taille, graisse, interlignage)
  for (const jeton of TYPOGRAPHIE) {
    const id = identifiantCSS(jeton.nom);
    lignes.push(`  --font-size-${id}: ${jeton.taille};`);
    lignes.push(`  --font-weight-${id}: ${jeton.graisse};`);
    lignes.push(`  --line-height-${id}: ${jeton.interlignage};`);
  }

  // Espacement
  for (const jeton of ESPACEMENT) {
    lignes.push(`  --space-${identifiantCSS(jeton.nom)}: ${jeton.valeur};`);
  }

  // Bordure et ombre (nom déjà préfixé : radius-sm, border-width, shadow-md…)
  for (const jeton of BORDURE) {
    lignes.push(`  --${identifiantCSS(jeton.nom)}: ${jeton.valeur};`);
  }

  // Composants (nom déjà préfixé : button-height, input-height…)
  for (const jeton of COMPOSANT) {
    lignes.push(`  --${identifiantCSS(jeton.nom)}: ${jeton.valeur};`);
  }

  // Mouvement et animation
  for (const jeton of MOUVEMENT) {
    lignes.push(`  --transition-${identifiantCSS(jeton.nom)}: ${jeton.valeur};`);
  }

  // Focus (nom déjà préfixé : ring-width, ring-color, ring-offset)
  for (const jeton of FOCUS) {
    lignes.push(`  --${identifiantCSS(jeton.nom)}: ${jeton.valeur};`);
  }

  // Z-index
  for (const jeton of Z_INDEX) {
    lignes.push(`  --z-${identifiantCSS(jeton.nom)}: ${jeton.valeur};`);
  }

  // Breakpoints
  for (const jeton of BREAKPOINT) {
    lignes.push(`  --breakpoint-${identifiantCSS(jeton.nom)}: ${jeton.valeur};`);
  }

  lignes.push('}');
  lignes.push('');
  return lignes.join('\n');
}

/** Génère le contenu du fichier JSON (les deux thèmes + familles invariantes). */
function genererJSON(): string {
  const donnees: Record<string, Record<string, string>> = {};

  for (const theme of THEMES) {
    const entries: Record<string, string> = {};
    for (const couleur of theme.couleurs) {
      entries[`color-${identifiantCSS(couleur.nom)}`] = couleur.valeur;
    }
    donnees[theme.nom] = entries;
  }

  // Familles invariantes de thème (émises une fois)
  const globales: Record<string, string> = {};
  globales['font-family-base'] = "'Inter', system-ui, sans-serif";
  for (const jeton of TYPOGRAPHIE) {
    const id = identifiantCSS(jeton.nom);
    globales[`font-size-${id}`] = jeton.taille;
    globales[`font-weight-${id}`] = String(jeton.graisse);
    globales[`line-height-${id}`] = String(jeton.interlignage);
  }
  for (const jeton of ESPACEMENT) {
    globales[`space-${identifiantCSS(jeton.nom)}`] = jeton.valeur;
  }
  for (const jeton of BORDURE) {
    globales[identifiantCSS(jeton.nom)] = jeton.valeur;
  }
  for (const jeton of COMPOSANT) {
    globales[identifiantCSS(jeton.nom)] = jeton.valeur;
  }
  for (const jeton of MOUVEMENT) {
    globales[`transition-${identifiantCSS(jeton.nom)}`] = jeton.valeur;
  }
  for (const jeton of FOCUS) {
    globales[identifiantCSS(jeton.nom)] = jeton.valeur;
  }
  for (const jeton of Z_INDEX) {
    globales[`z-${identifiantCSS(jeton.nom)}`] = jeton.valeur;
  }
  for (const jeton of BREAKPOINT) {
    globales[`breakpoint-${identifiantCSS(jeton.nom)}`] = jeton.valeur;
  }
  donnees.globales = globales;

  return JSON.stringify(donnees, null, 2) + '\n';
}

/** Génère tous les artefacts (CSS + JSON) à la racine du package. */
export function genererArtefacts(): void {
  for (const theme of THEMES) {
    const css = genererCSS(theme);
    const nomFichier = theme.nom === 'normal' ? 'tokens-normal.css' : 'tokens-ramadan.css';
    writeFileSync(join(RACINE_PACKAGE, nomFichier), css, 'utf-8');
  }

  const json = genererJSON();
  writeFileSync(join(RACINE_PACKAGE, 'tokens.json'), json, 'utf-8');
}

/** Lit un fichier généré et retourne son contenu. */
export function lireArtefact(nom: string): string {
  return readFileSync(join(RACINE_PACKAGE, nom), 'utf-8');
}
