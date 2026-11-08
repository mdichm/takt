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
  {
    code: 'DT-COLOR-01',
    nom: 'Primary',
    valeur: '#2563EB',
    usage: 'Couleur principale de marque',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-02',
    nom: 'Primary hover',
    valeur: '#1D4ED8',
    usage: 'État survol',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-03',
    nom: 'Primary active',
    valeur: '#1E40AF',
    usage: 'État actif/cliqué',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-04',
    nom: 'Secondary',
    valeur: '#64748B',
    usage: 'Couleur secondaire',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-05',
    nom: 'Surface',
    valeur: '#FFFFFF',
    usage: 'Fond des cartes',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-06',
    nom: 'Surface variant',
    valeur: '#F8FAFC',
    usage: 'Fond alternatif',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-07',
    nom: 'Background',
    valeur: '#F1F5F9',
    usage: 'Fond de page',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-08',
    nom: 'Text primary',
    valeur: '#0F172A',
    usage: 'Texte principal',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-09',
    nom: 'Text secondary',
    valeur: '#475569',
    usage: 'Texte secondaire',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-10',
    nom: 'Text disabled',
    valeur: '#94A3B8',
    usage: 'Texte désactivé',
    role: 'composant',
  },
  { code: 'DT-COLOR-11', nom: 'Border', valeur: '#E2E8F0', usage: 'Bordures', role: 'composant' },
  {
    code: 'DT-COLOR-12',
    nom: 'Divider',
    valeur: '#CBD5E1',
    usage: 'Séparateurs',
    role: 'composant',
  },
];

/** Tokens sémantiques d'état (corrections de contraste appliquées). */
const ETATS_NORMAL: readonly JetonCouleur[] = [
  {
    code: 'DT-COLOR-20',
    nom: 'Success',
    valeur: '#047857',
    usage: 'Succès, validation',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-21',
    nom: 'Warning',
    valeur: '#B45309',
    usage: 'Alerte, attention',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-22',
    nom: 'Error',
    valeur: '#B91C1C',
    usage: 'Erreur, conflit',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-23',
    nom: 'Info',
    valeur: '#1D4ED8',
    usage: 'Information',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-24',
    nom: 'Lock',
    valeur: '#64748B',
    usage: 'Verrou de séance',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-25',
    nom: 'Lock incompatible',
    valeur: '#EF4444',
    usage: 'Verrou bloquant',
    role: 'composant',
  },
];

const ETATS_RAMADAN: readonly JetonCouleur[] = [
  {
    code: 'DT-COLOR-20',
    nom: 'Success',
    valeur: '#047857',
    usage: 'Succès, validation',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-21',
    nom: 'Warning',
    valeur: '#B45309',
    usage: 'Alerte, attention',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-22',
    nom: 'Error',
    valeur: '#7F1D1D',
    usage: 'Erreur, conflit',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-23',
    nom: 'Info',
    valeur: '#1D4ED8',
    usage: 'Information',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-24',
    nom: 'Lock',
    valeur: '#475569',
    usage: 'Verrou de séance',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-25',
    nom: 'Lock incompatible',
    valeur: '#DC2626',
    usage: 'Verrou bloquant',
    role: 'composant',
  },
];

/** Thème Ramadan spécifique. */
const RAMADAN_SPECIFIQUE: readonly JetonCouleur[] = [
  {
    code: 'DT-COLOR-30',
    nom: 'Primary',
    valeur: '#7C3AED',
    usage: 'Couleur principale en thème Ramadan',
    role: 'texte-normal',
  },
  {
    code: 'DT-COLOR-31',
    nom: 'Surface',
    valeur: '#FAF5FF',
    usage: 'Fond des cartes Ramadan',
    role: 'composant',
  },
  {
    code: 'DT-COLOR-32',
    nom: 'Accent',
    valeur: '#B45309',
    usage: "Couleur d'accentuation Ramadan",
    role: 'composant',
  },
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

// ============================================================================
// Familles de jetons invariantes de thème (typographie, espacement, bordure,
// composants, mouvement, focus, z-index, breakpoints).
// Ces familles sont identiques sur Normal et Ramadan ; elles sont émises dans
// le bloc « Variables globales » des deux fichiers CSS.
// ============================================================================

/** Jeton de typographie (taille, graisse, interlignage). */
export interface JetonTypographie {
  /** Code de traçabilité (ex: DT-TYPO-01). */
  readonly code: string;
  /** Nom lisible (ex: h1). */
  readonly nom: string;
  /** Taille de police (ex: 2rem). */
  readonly taille: string;
  /** Graisse (ex: 700). */
  readonly graisse: number;
  /** Interlignage (ex: 1.2). */
  readonly interlignage: number;
  /** Usage. */
  readonly usage: string;
}

/** Jeton à valeur simple (espacement, bordure, composant, mouvement, etc.). */
export interface JetonSimple {
  /** Code de traçabilité (ex: DT-SPACE-01). */
  readonly code: string;
  /** Nom lisible (ex: xxs). */
  readonly nom: string;
  /** Valeur (ex: 0.25rem). */
  readonly valeur: string;
  /** Usage. */
  readonly usage: string;
}

/** Jeton de focus (anneau de clavier). */
export type JetonFocus = JetonSimple;

/** Jeton de z-index. */
export type JetonZIndex = JetonSimple;

/** Jeton de breakpoint. */
export type JetonBreakpoint = JetonSimple;

/** Tokens de typographie (§3 UI_DESIGN_TOKENS). */
export const TYPOGRAPHIE: readonly JetonTypographie[] = [
  {
    code: 'DT-TYPO-01',
    nom: 'h1',
    taille: '2rem',
    graisse: 700,
    interlignage: 1.2,
    usage: 'Titre de page',
  },
  {
    code: 'DT-TYPO-02',
    nom: 'h2',
    taille: '1.5rem',
    graisse: 600,
    interlignage: 1.25,
    usage: 'Titre de section',
  },
  {
    code: 'DT-TYPO-03',
    nom: 'h3',
    taille: '1.25rem',
    graisse: 600,
    interlignage: 1.3,
    usage: 'Sous-titre',
  },
  {
    code: 'DT-TYPO-04',
    nom: 'body',
    taille: '1rem',
    graisse: 400,
    interlignage: 1.5,
    usage: 'Texte courant',
  },
  {
    code: 'DT-TYPO-05',
    nom: 'body-small',
    taille: '0.875rem',
    graisse: 400,
    interlignage: 1.4,
    usage: 'Texte secondaire',
  },
  {
    code: 'DT-TYPO-06',
    nom: 'caption',
    taille: '0.75rem',
    graisse: 400,
    interlignage: 1.4,
    usage: 'Légende, aide',
  },
  {
    code: 'DT-TYPO-07',
    nom: 'button',
    taille: '0.875rem',
    graisse: 500,
    interlignage: 1.2,
    usage: 'Texte des boutons',
  },
  {
    code: 'DT-TYPO-08',
    nom: 'badge',
    taille: '0.75rem',
    graisse: 600,
    interlignage: 1.2,
    usage: "Badges d'état",
  },
];

/** Tokens d'espacement (§4 UI_DESIGN_TOKENS). */
export const ESPACEMENT: readonly JetonSimple[] = [
  { code: 'DT-SPACE-01', nom: 'xxs', valeur: '0.25rem', usage: 'Espacement très serré' },
  { code: 'DT-SPACE-02', nom: 'xs', valeur: '0.5rem', usage: 'Espacement serré' },
  { code: 'DT-SPACE-03', nom: 's', valeur: '0.75rem', usage: 'Espacement standard réduit' },
  { code: 'DT-SPACE-04', nom: 'm', valeur: '1rem', usage: 'Espacement standard' },
  { code: 'DT-SPACE-05', nom: 'l', valeur: '1.5rem', usage: 'Espacement large' },
  { code: 'DT-SPACE-06', nom: 'xl', valeur: '2rem', usage: 'Espacement très large' },
  { code: 'DT-SPACE-07', nom: 'xxl', valeur: '3rem', usage: 'Espacement maximal' },
  { code: 'DT-SPACE-08', nom: 'gutter', valeur: '1rem', usage: 'Gouttière de grille' },
];

/** Tokens de bordure et ombre (§5 UI_DESIGN_TOKENS). */
export const BORDURE: readonly JetonSimple[] = [
  { code: 'DT-BORDER-01', nom: 'radius-sm', valeur: '0.25rem', usage: 'Petits composants' },
  { code: 'DT-BORDER-02', nom: 'radius-md', valeur: '0.5rem', usage: 'Boutons, cartes' },
  { code: 'DT-BORDER-03', nom: 'radius-lg', valeur: '0.75rem', usage: 'Modals, grands panneaux' },
  { code: 'DT-BORDER-04', nom: 'radius-xl', valeur: '1rem', usage: 'Éléments arrondis' },
  {
    code: 'DT-BORDER-05',
    nom: 'border-width',
    valeur: '1px',
    usage: 'Épaisseur de bordure standard',
  },
  {
    code: 'DT-BORDER-06',
    nom: 'shadow-sm',
    valeur: '0 1px 2px rgba(0,0,0,0.05)',
    usage: 'Ombre légère',
  },
  {
    code: 'DT-BORDER-07',
    nom: 'shadow-md',
    valeur: '0 4px 6px rgba(0,0,0,0.07)',
    usage: 'Ombre standard',
  },
  {
    code: 'DT-BORDER-08',
    nom: 'shadow-lg',
    valeur: '0 10px 15px rgba(0,0,0,0.1)',
    usage: 'Ombre forte (modals)',
  },
];

/** Tokens de composants (§6 UI_DESIGN_TOKENS). */
export const COMPOSANT: readonly JetonSimple[] = [
  { code: 'DT-COMP-01', nom: 'button-height', valeur: '2.5rem', usage: 'Hauteur des boutons' },
  {
    code: 'DT-COMP-02',
    nom: 'button-padding-x',
    valeur: '1rem',
    usage: 'Padding horizontal bouton',
  },
  { code: 'DT-COMP-03', nom: 'input-height', valeur: '2.5rem', usage: 'Hauteur des champs' },
  { code: 'DT-COMP-04', nom: 'card-padding', valeur: '1.5rem', usage: 'Padding des cartes' },
  {
    code: 'DT-COMP-05',
    nom: 'table-row-height',
    valeur: '3rem',
    usage: 'Hauteur des lignes tableau',
  },
  {
    code: 'DT-COMP-06',
    nom: 'badge-padding-x',
    valeur: '0.5rem',
    usage: 'Padding horizontal badge',
  },
  {
    code: 'DT-COMP-07',
    nom: 'grid-cell-height',
    valeur: '4rem',
    usage: 'Hauteur des cellules grille EDT',
  },
  { code: 'DT-COMP-08', nom: 'sidebar-width', valeur: '16rem', usage: 'Largeur de la sidebar' },
];

/** Tokens de mouvement et animation (§7 UI_DESIGN_TOKENS). */
export const MOUVEMENT: readonly JetonSimple[] = [
  { code: 'DT-MOTION-01', nom: 'fast', valeur: '150ms ease-out', usage: 'Micro-interactions' },
  {
    code: 'DT-MOTION-02',
    nom: 'normal',
    valeur: '250ms ease-in-out',
    usage: 'Transitions standard',
  },
  { code: 'DT-MOTION-03', nom: 'slow', valeur: '350ms ease-in-out', usage: 'Ouverture de modals' },
  { code: 'DT-MOTION-04', nom: 'drag', valeur: '200ms ease-out', usage: 'Déplacement séance' },
  {
    code: 'DT-MOTION-05',
    nom: 'toast',
    valeur: '150ms ease-out',
    usage: 'Apparition notification',
  },
];

/** Tokens d'anneau de focus (clavier, WCAG 2.4.7). Invariants de thème. */
export const FOCUS: readonly JetonFocus[] = [
  {
    code: 'DT-FOCUS-01',
    nom: 'ring-width',
    valeur: '2px',
    usage: "Épaisseur de l'anneau de focus",
  },
  {
    code: 'DT-FOCUS-02',
    nom: 'ring-color',
    valeur: 'var(--color-primary)',
    usage: "Couleur de l'anneau de focus (suit le thème)",
  },
  {
    code: 'DT-FOCUS-03',
    nom: 'ring-offset',
    valeur: '2px',
    usage: "Décalage de l'anneau de focus",
  },
];

/** Tokens de z-index (stacking context). Invariants de thème. */
export const Z_INDEX: readonly JetonZIndex[] = [
  { code: 'DT-ZINDEX-01', nom: 'base', valeur: '0', usage: 'Élément de base' },
  { code: 'DT-ZINDEX-02', nom: 'dropdown', valeur: '100', usage: 'Menus déroulants' },
  { code: 'DT-ZINDEX-03', nom: 'sticky', valeur: '200', usage: 'Éléments collants' },
  { code: 'DT-ZINDEX-04', nom: 'modal', valeur: '1000', usage: 'Modals' },
  { code: 'DT-ZINDEX-05', nom: 'toast', valeur: '2000', usage: 'Toasts et notifications' },
];

/** Tokens de breakpoint (points de rupture responsive). Invariants de thème. */
export const BREAKPOINT: readonly JetonBreakpoint[] = [
  { code: 'DT-BREAKPOINT-01', nom: 'sm', valeur: '640px', usage: 'Petits écrans' },
  { code: 'DT-BREAKPOINT-02', nom: 'md', valeur: '768px', usage: 'Tablettes' },
  { code: 'DT-BREAKPOINT-03', nom: 'lg', valeur: '1024px', usage: 'Ordinateurs' },
  { code: 'DT-BREAKPOINT-04', nom: 'xl', valeur: '1280px', usage: 'Grands écrans' },
];
