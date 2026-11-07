// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';

interface ChipProps extends PropsBase {
  /** Texte affiché. */
  readonly libelle: string;
  /** Si le puce est sélectionnée/active. */
  readonly active?: boolean;
  /** Gestionnaire de clic. */
  readonly onClick?: () => void;
  /** Si le puce est supprimable (affiche une croix). */
  readonly supprimer?: boolean;
  /** Gestionnaire de suppression. */
  readonly onSupprimer?: () => void;
}

/** Puce (chip) interactive, accessible au clavier. 0 couleur en dur. */
export function Chip({ libelle, active = false, onClick, supprimer = false, onSupprimer, className }: ChipProps): JSX.Element {
  const fond = active ? 'var(--color-primary)' : 'var(--color-surface-variant)';
  const texte = active ? 'var(--color-surface)' : 'var(--color-text-primary)';
  const bordure = active ? 'transparent' : 'var(--color-border)';

  return (
    <button
      type="button"
      role="button"
      aria-pressed={active}
        aria-label={supprimer ? `Supprimer ${libelle}` : libelle}
      onClick={onSupprimer ? (e) => { e.stopPropagation(); onSupprimer?.(); } : onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xxs)',
        padding: `0 var(--space-s)`,
        height: 'var(--input-height)',
        border: `var(--border-width) solid ${bordure}`,
        borderRadius: 'var(--radius-xl)',
        background: fond,
        color: texte,
        fontSize: 'var(--font-size-caption)',
        fontWeight: 500,
        cursor: onClick || onSupprimer ? 'pointer' : 'default',
        outline: 'none',
      }}
      className={className}
    >
      {libelle}
      {supprimer && onSupprimer && (
        <span
          aria-label="Supprimer"
          onClick={(e) => { e.stopPropagation(); onSupprimer?.(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </span>
      )}
    </button>
  );
}
