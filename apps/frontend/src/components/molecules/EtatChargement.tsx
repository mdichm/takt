// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Spinner } from '../atoms/Spinner';
import { PropsBase } from '../types';

interface EtatChargementProps extends PropsBase {
  /** Libellé de chargement. */
  readonly libelle?: string;
}

/** État de chargement avec indicateur animé. */
export function EtatChargement({
  libelle = 'Chargement en cours…',
  className,
}: EtatChargementProps): JSX.Element {
  return (
    <div
      aria-label={libelle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        gap: 'var(--space-m)',
        color: 'var(--color-text-secondary)',
      }}
      className={className}
    >
      <Spinner ariaLabel={libelle} taille={32} />
      <span style={{ fontSize: 'var(--font-size-body)' }}>{libelle}</span>
    </div>
  );
}
