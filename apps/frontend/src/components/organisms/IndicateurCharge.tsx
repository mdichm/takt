// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Badge } from '../atoms/Badge';

interface IndicateurChargeProps {
  readonly label: string;
  readonly valeur: number; // 0-100
  readonly max?: number;
  readonly chargement?: boolean;
}

/** Indicateur de charge de travail : barre de progression + pourcentage + badge de niveau. */
export function IndicateurCharge({
  label,
  valeur,
  max = 100,
  chargement = false,
}: IndicateurChargeProps): JSX.Element {
  const pourcentage = Math.min(100, Math.max(0, Math.round((valeur / max) * 100)));
  let niveau: 'faible' | 'moyen' | 'élevé' | 'critique';
  let variante: 'succès' | 'attention' | 'erreur';
  if (pourcentage < 50) {
    niveau = 'faible';
    variante = 'succès';
  } else if (pourcentage < 75) {
    niveau = 'moyen';
    variante = 'attention';
  } else if (pourcentage < 90) {
    niveau = 'élevé';
    variante = 'attention';
  } else {
    niveau = 'critique';
    variante = 'erreur';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-s)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--font-size-body)',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 'var(--font-size-body)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {pourcentage}%
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 'var(--space-s)',
          background: 'var(--color-surface-variant)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: `var(--border-width) solid var(--color-border)`,
        }}
      >
        <div
          role="progressbar"
          aria-valuenow={pourcentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} : ${pourcentage} pour cent`}
          style={{
            width: chargement ? '100%' : `${pourcentage}%`,
            height: '100%',
            background: 'var(--color-primary)',
            transition: 'width 0.3s ease-in-out',
          }}
        />
      </div>
      <Badge variante={variante} libelle={niveau} />
    </div>
  );
}
