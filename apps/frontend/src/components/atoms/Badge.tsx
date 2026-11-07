// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase, VarianteAlerte } from '../types';

/** Couleur de fond d'un badge par variante (jetons design-tokens, 0 couleur en dur). */
const FOND_VARIANTE: Record<VarianteAlerte, string> = {
  info: 'var(--color-info)',
  succès: 'var(--color-success)',
  attention: 'var(--color-warning)',
  erreur: 'var(--color-error)',
};

interface BadgeProps extends PropsBase {
  /** Variante de couleur (détermine le fond via un jeton). */
  readonly variante: VarianteAlerte;
  /** Texte affiché. */
  readonly libelle: string;
}

/** Badge d'état. Utilise exclusivement des variables CSS des design tokens. */
export function Badge({ variante, libelle, className }: BadgeProps): JSX.Element {
  return (
    <span
      role="status"
      aria-label={`${libelle} (${variante})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `0 var(--space-xs)`,
        borderRadius: 'var(--radius-md)',
        background: FOND_VARIANTE[variante],
        color: 'var(--color-surface)',
        fontSize: 'var(--font-size-caption)',
        fontWeight: 600,
        lineHeight: 'var(--line-height-caption)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
      className={className}
    >
      {libelle}
    </span>
  );
}
