// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, type JetonCouleur } from './tokens';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const RACINE_PACKAGE = join(__dirname, '..');

/** Convertit un nom lisible en nom de variable CSS (kebab-case, préfixé --color-). */
function nomVariableCSS(nom: string): string {
  return `--color-${nom.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')}`;
}

/** Génère le contenu d'un fichier CSS pour un thème. */
function genererCSS(theme: (typeof THEMES)[number]): string {
  const lignes: string[] = [];
  lignes.push(`/* Thème ${theme.nom} — généré automatiquement à partir de src/tokens.ts */`);
  lignes.push(`/* Ne pas éditer manuellement : exécuter pnpm run generate */`);
  lignes.push('');

  const selecteur = theme.nom === 'normal' ? ':root' : `[data-theme='${theme.nom}']`;
  lignes.push(`${selecteur} {`);

  // Map nom → valeur : les surcharges du thème écrasent les valeurs par défaut
  const valeurs = new Map<string, string>();
  for (const couleur of theme.couleurs) {
    valeurs.set(couleur.nom, couleur.valeur);
  }

  for (const [nom, valeur] of valeurs) {
    const variable = nomVariableCSS(nom);
    lignes.push(`  ${variable}: ${valeur};`);
  }

  // Variables globales (RB-DT-02, DL-DT-01)
  lignes.push('');
  lignes.push('  /* Variables globales */');
  lignes.push(`  --font-family-base: 'Inter', system-ui, sans-serif;`);
  lignes.push('  --spacing-xs: 0.25rem;');
  lignes.push('  --spacing-sm: 0.5rem;');
  lignes.push('  --spacing-md: 1rem;');
  lignes.push('  --spacing-lg: 1.5rem;');
  lignes.push('  --spacing-xl: 2rem;');
  lignes.push('  --radius-sm: 0.25rem;');
  lignes.push('  --radius-md: 0.5rem;');
  lignes.push('  --radius-lg: 0.75rem;');
  lignes.push('  --transition-fast: 150ms ease;');
  lignes.push('  --transition-base: 250ms ease;');

  lignes.push('}');
  lignes.push('');
  return lignes.join('\n');
}

/** Génère le contenu du fichier JSON (les deux thèmes). */
function genererJSON(): string {
  const donnees: Record<string, Record<string, string>> = {};

  for (const theme of THEMES) {
    const entries: Record<string, string> = {};
    for (const couleur of theme.couleurs) {
      entries[nomVariableCSS(couleur.nom).slice(2)] = couleur.valeur;
    }
    donnees[theme.nom] = entries;
  }

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

/** Vérifie qu'un jeton est présent dans les deux thèmes. */
export function obtenirValeur(code: string, themeNom: 'normal' | 'ramadan'): string {
  const theme = THEMES.find((t) => t.nom === themeNom);
  if (!theme) {
    throw new Error(`Thème inconnu : ${themeNom}`);
  }
  const jeton = theme.couleurs.find((c) => c.code === code);
  if (!jeton) {
    throw new Error(`Jeton ${code} introuvable dans le thème ${themeNom}`);
  }
  return jeton.valeur;
}

export type { JetonCouleur };
