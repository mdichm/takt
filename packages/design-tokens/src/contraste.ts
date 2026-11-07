// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Canal RGB linéarisé selon WCAG 2.x. */
function lineariser(composant: number): number {
  const c = composant / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Luminance relative d'une couleur hexadécimale (#RRGGBB). */
export function luminanceRelative(hexa: string): number {
  const match = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/.exec(hexa);
  if (!match) {
    throw new Error(`Couleur invalide : ${hexa}`);
  }
  const r = lineariser(Number.parseInt(match[1]!, 16));
  const g = lineariser(Number.parseInt(match[2]!, 16));
  const b = lineariser(Number.parseInt(match[3]!, 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste entre deux couleurs hexadécimales (>= 1). */
export function calculerRatioContrastes(hexa1: string, hexa2: string): number {
  const l1 = luminanceRelative(hexa1);
  const l2 = luminanceRelative(hexa2);
  const clair = Math.max(l1, l2);
  const sombre = Math.min(l1, l2);
  return (clair + 0.05) / (sombre + 0.05);
}

/** Vérifie qu'un ratio respecte le seuil WCAG demandé. */
export function estConformeWCAG(ratio: number, seuil: number): boolean {
  return ratio >= seuil;
}
