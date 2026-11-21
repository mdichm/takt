// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '@/components/types';

/**
 * Skeleton de chargement structurel pour les zones lentes.
 *
 * - Utilise exclusivement des jetons de design (0 couleur en dur)
 * - Annonce son etat via aria-busy et role="status"
 * - Sert de fallback Suspense pour les pages chargees paresseusement
 */
export function Skeleton({ className }: PropsBase & { readonly className?: string }): JSX.Element {
  return (
    <div
      data-testid="skeleton"
      role="status"
      aria-label="Chargement en cours"
      aria-busy={true}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
        padding: 'var(--space-m)',
        color: 'var(--color-text-secondary)',
        ...(className ? {} : {}),
      }}
      className={className}
    >
      <div
        style={{
          height: 'var(--font-size-body)',
          width: '60%',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface-elevated)',
        }}
      />
      <div
        style={{
          height: 'var(--font-size-body)',
          width: '40%',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface-elevated)',
        }}
      />
    </div>
  );
}
