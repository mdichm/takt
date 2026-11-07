// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const RACINE_COMPONENTS = join(__dirname);

// Regex pour détecter des couleurs en dur : hex (#fff, #ffffff), rgb/rgba, hsl/hsla,
// ou noms de couleur CSS (red, blue, green, etc.) — exclut les var(--...).
const COULEUR_DUR = /(?:^|[^:/\w-])(?:# [0-9a-fA-F]{3,8}|#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|hsl\(|hsla\(|(?:red|blue|green|black|white|yellow|orange|purple|pink|gray|grey|brown|cyan|magenta|indigo|violet|crimson|salmon|teal|navy|maroon|olive|lime|gold|silver|azure|beige|coral|ivory|khaki|orchid|plum|salmon|tan|wheat|aliceblue|antiquewhite|aquamarine|beige|bisque|blanchedalmond|chartreuse|chocolate|cornflower|cornsilk|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|greenyellow|honeydew|hotpink|indianred|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|limegreen|linen|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|oldlace|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|powderblue|rosybrown|royalblue|saddlebrown|sandybrown|seagreen|seashell|sienna|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|thistle|tomato|turquoise|wheat|whitesmoke|yellowgreen)\b)/i;

// Exclut les fichiers de test et les fichiers générés.
const EXCLURE = ['.test.tsx', '.test.ts', '.a11y.test.tsx', 'node_modules', 'dist', 'build'];

function listerFichiers(source: string): string[] {
  const resultats: string[] = [];
  for (const entree of readdirSync(source, { withFileTypes: true })) {
    const chemin = join(source, entree.name);
    if (entree.isDirectory()) {
      if (!EXCLURE.includes(entree.name)) resultats.push(...listerFichiers(chemin));
    } else if (entree.name.endsWith('.tsx') || entree.name.endsWith('.ts')) {
      if (!EXCLURE.some((e) => entree.name.includes(e))) resultats.push(chemin);
    }
  }
  return resultats;
}

describe('Aucune couleur en dur dans le design system', () => {
  it('aucun fichier source ne contient de couleur en dur (hex, rgb, rgba, hsl, nom CSS)', () => {
    const fichiers = listerFichiers(RACINE_COMPONENTS);
    const violations: string[] = [];
    for (const fichier of fichiers) {
      const contenu = readFileSync(fichier, 'utf-8');
      const lignes = contenu.split('\n');
      lignes.forEach((ligne, i) => {
        // Ignore les lignes contenant var(-- (variables design tokens)
        if (ligne.includes('var(--')) return;
        // Ignore les commentaires
        if (ligne.trim().startsWith('//')) return;
        const match = ligne.match(COULEUR_DUR);
        if (match) violations.push(`${fichier}:${i + 1}: ${ligne.trim()}`);
      });
    }
    expect(violations).toEqual([]);
  });
});