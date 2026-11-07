// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';

/** Nom d'icône supporté. */
export type NomIcone =
  | 'accueil'
  | 'utilisateur'
  | 'calendrier'
  | 'recherche'
  | 'fermer'
  | 'alerte'
  | 'succès'
  | 'info'
  | 'verrou'
  | 'chevron-bas'
  | 'chevron-haut'
  | 'plus'
  | 'supprimer';

/** Map nom → chemin SVG (0 couleur en dur : currentColor, géré par le parent). */
const CHEMINS: Record<NomIcone, string> = {
  accueil: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  utilisateur: 'M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm0 2c-2.6 0-5 1.3-5 3v3c0 .6.4 1 1 1h1v1h1v-1h1c.6 0 1-.4 1-1v-3c0-1.7-2.4-3-5-3z',
  calendrier: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
  recherche: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  fermer: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  alerte: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  succès: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59 1.41 1.41z',
  info: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 2c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  verrou: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-3 6V8c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v6h-2V8c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4v6h-2z',
  'chevron-bas': 'M7 10l5 5 5-5z',
  'chevron-haut': 'M7 14l5-5 5 5z',
  plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z',
  supprimer: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
};

interface IconeProps extends PropsBase {
  /** Nom de l'icône à afficher. */
  readonly nom: NomIcone;
  /** Label textuel pour les lecteurs d'écran (si l'icône porte une signification). */
  readonly ariaLabel?: string;
  /** Taille en pixels (applique width/height). */
  readonly taille?: number;
}

/** Icône SVG accessible. Par défaut masquée aux lecteurs d'écran (décorative). */
export function Icone({ nom, ariaLabel, taille = 20, className }: IconeProps): JSX.Element {
  const d = CHEMINS[nom];
  return (
    <svg
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
