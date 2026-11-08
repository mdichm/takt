// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Point d'entrée des jetons de design. */
// Source de vérité des jetons de design (Normal + Ramadan).
export {
  THEMES,
  THEME_DEFAUT,
  SEUIL_CONTRASTE,
  type Theme,
  type JetonCouleur,
  obtenirTheme,
  obtenirValeur,
} from './tokens';

// Utilitaires de contraste WCAG 2.x.
export { calculerRatioContrastes, estConformeWCAG, luminanceRelative } from './contraste';

// Génération des artefacts CSS/JSON à partir de src/tokens.ts.
export { genererArtefacts, lireArtefact } from './generer';

// Familles de jetons invariantes de thème (typographie, espacement, bordure,
// composants, mouvement, focus, z-index, breakpoints).
export {
  type JetonTypographie,
  type JetonSimple,
  type JetonFocus,
  type JetonZIndex,
  type JetonBreakpoint,
  TYPOGRAPHIE,
  ESPACEMENT,
  BORDURE,
  COMPOSANT,
  MOUVEMENT,
  FOCUS,
  Z_INDEX,
  BREAKPOINT,
} from './tokens';
