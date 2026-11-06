// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Rôle d'une paire texte/fond : fixe le seuil WCAG applicable. */
export type RoleContraste = 'texte-normal' | 'composant';

/** Seuil WCAG par rôle (RB-DT-04). */
export const SEUIL_CONTRASTE: Record<RoleContraste, number> = {
  'texte-normal': 4.5,
  composant: 3,
};

/** Un jeton de couleur avec son code DT-*. */
export interface JetonCouleur {
  /** Code de traçabilité (ex: DT-COLOR-21). */
  readonly code: string;
  /** Nom lisible. */
  readonly nom: string;
  /** Valeur hexadécimale. */
  readonly valeur: string;
  /** Usage. */
  readonly usage: string;
  /** Rôle de contraste pour ce jeton. */
  readonly role: RoleContraste;
}

/** Palette de base commune aux deux thèmes. */
const PALETTE_COMMUNE: readonly JetonCouleur[] = [
  { code: 'DT-COLOR-01', nom: 'Primary', valeur: '#2563EB', usage: 'Couleur principale de marque', role: 'texte-normal' },
  { code: 'DT-COLOR-02', nom: 'Primary hover', valeur: '#1D4ED8', usage: 'État survol', role: 'composant' },
  { code: 'DT-COLOR-03', nom: 'Primary active', valeur: '#1E40AF', usage: 'État actif/cliqué', role: 'composant' },
  { code: 'DT-COLOR-04', nom: 'Secondary', valeur: '#64748B', usage: 'Couleur secondaire', role: 'composant' },
  { code: 'DT-COLOR-05', nom: 'Surface', valeur: '#FFFFFF', usage: 'Fond des cartes', role: 'composant' },
  { code: 'DT-COLOR-06', nom: 'Surface variant', valeur: '#F8FAFC', usage: 'Fond alternatif', role: 'composant' },
  { code: 'DT-COLOR-07', nom: 'Background', valeur: '#F1F5F9', usage: 'Fond de page', role: 'composant' },
  { code: 'DT-COLOR-08', nom: 'Text primary', valeur: '#0F172A', usage: 'Texte principal', role: 'texte-normal' },
  { code: 'DT-COLOR-09', nom: 'Text secondary', valeur: '#475569', usage: 'Texte secondaire', role: 'texte-normal' },
  { code: 'DT-COLOR-10', nom: 'Text disabled', valeur: '#94A3B8', usage: 'Texte désactivé', role: 'composant' },
  { code: 'DT-COLOR-11', nom: 'Border', valeur: '#E2E8F0', usage: 'Bordures', role: 'composant' },
  { code: 'DT-COLOR-12', nom: 'Divider', valeur: '#CBD5E1', usage: 'Séparateurs', role: 'composant' },
];

/** Tokens sémantiques d'état (corrections de contraste appliquées). */
const ETATS_NORMAL: readonly JetonCouleur[] = [
  { code: 'DT-COLOR-20', nom: 'Success', valeur: '#047857', usage: 'Succès, validation', role: 'composant' },
  { code: 'DT-COLOR-21', nom: 'Warning', valeur: '#B45309', usage: 'Alerte, attention', role: 'composant' },
  { code: 'DT-COLOR-22', nom: 'Error', valeur: '#B91C1C', usage: 'Erreur, conflit', role: 'texte-normal' },
  { code: 'DT-COLOR-23', nom: 'Info', valeur: '#1D4ED8', usage: 'Information', role: 'texte-normal' },
  { code: 'DT-COLOR-24', nom: 'Lock', valeur: '#64748B', usage: 'Verrou de séance', role: 'composant' },
  { code: 'DT-COLOR-25', nom: 'Lock incompatible', valeur: '#EF4444', usage: 'Verrou bloquant', role: 'composant' },
];

const ETATS_RAMADAN: readonly JetonCouleur[] = [
  { code: 'DT-COLOR-20', nom: 'Success', valeur: '#047857', usage: 'Succès, validation', role: 'composant' },
  { code: 'DT-COLOR-21', nom: 'Warning', valeur: '#B45309', usage: 'Alerte, attention', role: 'composant' },
  { code: 'DT-COLOR-22', nom: 'Error', valeur: '#7F1D1D', usage: 'Erreur, conflit', role: 'texte-normal' },
  { code: 'DT-COLOR-23', nom: 'Info', valeur: '#1D4ED8', usage: 'Information', role: 'texte-normal' },
  { code: 'DT-COLOR-24', nom: 'Lock', valeur: '#475569', usage: 'Verrou de séance', role: 'composant' },
  { code: 'DT-COLOR-25', nom: 'Lock incompatible', valeur: '#DC2626', usage: 'Verrou bloquant', role: 'composant' },
];

/** Thème Ramadan spécifique. */
const RAMADAN_SPECIFIQUE: readonly JetonCouleur[] = [
  { code: 'DT-COLOR-30', nom: 'Primary', valeur: '#7C3AED', usage: 'Couleur principale en thème Ramadan', role: 'texte-normal' },
  { code: 'DT-COLOR-31', nom: 'Surface', valeur: '#FAF5FF', usage: 'Fond des cartes Ramadan', role: 'composant' },
  { code: 'DT-COLOR-32', nom: 'Accent', valeur: '#B45309', usage: 'Couleur d\'accentuation Ramadan', role: 'composant' },
];

/** Fonds par thème. */
interface Fonds {
  surface: string;
  background: string;
}

const FONDS: Record<'normal' | 'ramadan', Fonds> = {
  normal: { surface: '#FFFFFF', background: '#F1F5F9' },
  ramadan: { surface: '#FAF5FF', background: '#F1F5F9' },
};

/** Thème de design. */
export interface Theme {
  readonly nom: 'normal' | 'ramadan';
  readonly couleurs: readonly JetonCouleur[];
  readonly fonds: Fonds;
}

const couleursNormal = [...PALETTE_COMMUNE, ...ETATS_NORMAL];
const couleursRamadan = [...PALETTE_COMMUNE, ...ETATS_RAMADAN, ...RAMADAN_SPECIFIQUE];

/** Source de vérité des deux thèmes. */
export const THEMES: readonly Theme[] = [
  {
    nom: 'normal',
    couleurs: couleursNormal,
    fonds: FONDS.normal,
  },
  {
    nom: 'ramadan',
    couleurs: couleursRamadan,
    fonds: FONDS.ramadan,
  },
];

/** Thème par défaut. */
export const THEME_DEFAUT = THEMES[0];

/** Récupère un thème par son nom. */
export function obtenirTheme(nom: 'normal' | 'ramadan'): Theme {
  const theme = THEMES.find((t) => t.nom === nom);
  if (!theme) {
    throw new Error(`Thème inconnu : ${nom}`);
  }
  return theme;
}

/** Récupère la valeur d'un jeton dans un thème. */
export function obtenirValeur(code: string, themeNom: 'normal' | 'ramadan'): string {
  const theme = obtenirTheme(themeNom);
  const jeton = theme.couleurs.find((c) => c.code === code);
  if (!jeton) {
    throw new Error(`Jeton ${code} introuvable dans le thème ${themeNom}`);
  }
  return jeton.valeur;
}
