// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';
import { useId } from 'react';

interface BarreProgressionProps extends PropsBase {
  /** Progression en pourcentage (0-100). */
  readonly valeur: number;
  /** Libellé accessible de la barre. */
  readonly libelle?: string;
  /** Message de statut affiché à côté (ex. "Etape 3 sur 6"). */
  readonly message?: string;
}

/** Barre de progression accessible (role="progressbar"), 0 couleur en dur (tokens uniquement). */
export function BarreProgression({
  valeur,
  libelle = 'Progression',
  message,
  className,
}: BarreProgressionProps): JSX.Element {
  const pourcentage = Math.min(100, Math.max(0, Math.round(valeur)));
  const libelleAccessible = libelle ?? 'Progression de la génération';
  const idLibelle = useId();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-xs)',
        }}
      >
        <span
          id={idLibelle}
          style={{
            fontSize: 'var(--font-size-body-small)',
            color: 'var(--color-text-primary)',
          }}
        >
          {libelleAccessible}
        </span>
        {message && (
          <span
            style={{
              fontSize: 'var(--font-size-body-small)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {message}
          </span>
        )}
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'var(--space-s)',
          background: 'var(--color-surface-variant)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pourcentage}%`,
            background: 'var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 'var(--font-size-body-small)',
          color: 'var(--color-text-primary)',
          fontWeight: 600,
        }}
      >
        {pourcentage} %
      </span>
      <div
        role="progressbar"
        aria-valuenow={pourcentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby={idLibelle}
        style={{ position: 'absolute', clip: 'rect(0 0 0 0)', width: 1, height: 1, overflow: 'hidden' }}
      >
        {pourcentage} %
      </div>
    </div>
  );
}
