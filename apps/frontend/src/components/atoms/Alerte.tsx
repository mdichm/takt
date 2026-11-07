// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase, VarianteAlerte } from '../types';

const FOND_VARIANTE: Record<VarianteAlerte, string> = {
  info: 'var(--color-info)',
  succès: 'var(--color-success)',
  attention: 'var(--color-warning)',
  erreur: 'var(--color-error)',
};

interface AlerteProps extends PropsBase {
  /** Variante de gravite. */
  readonly variante: VarianteAlerte;
  /** Message affiche. */
  readonly message: string;
  /** Titre optionnel. */
  readonly titre?: string;
  /** Si l'alerte est fermable. */
  readonly fermable?: boolean;
  /** Gestionnaire de fermeture. */
  readonly onFermer?: () => void;
}

/** Alerte accessible (role="alert", couleur via jeton design-tokens). */
export function Alerte({ variante, message, titre, fermable = false, onFermer, className }: AlerteProps): JSX.Element {
  return (
    <div
      role="alert"
      aria-label={titre ? `${titre}: ${message}` : message}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-s)',
        padding: 'var(--space-m)',
        borderRadius: 'var(--radius-md)',
        border: `var(--border-width) solid ${FOND_VARIANTE[variante]}`,
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
      }}
      className={className}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        {variante === 'succès' && '✓'}
        {variante === 'erreur' && '✕'}
        {variante === 'attention' && '⚠'}
        {variante === 'info' && 'ℹ'}
      </div>
      <div style={{ flex: 1 }}>
        {titre && (
          <strong style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, marginBottom: 'var(--space-xxs)', display: 'block' }}>
            {titre}
          </strong>
        )}
        <span style={{ fontSize: 'var(--font-size-body)' }}>{message}</span>
      </div>
      {fermable && onFermer && (
        <button
          type="button"
          aria-label="Fermer l'alerte"
          onClick={onFermer}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-body)',
            lineHeight: 1,
            padding: 'var(--space-xxs)',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
