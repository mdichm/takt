// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';

interface SpinnerProps extends PropsBase {
  /** Libellé lu par les lecteurs d'écran. */
  readonly ariaLabel?: string;
  /** Taille en pixels. */
  readonly taille?: number;
}

/** Indicateur de chargement accessible (role="status", animation via CSS var). */
export function Spinner({ ariaLabel = 'Chargement en cours', taille = 24, className }: SpinnerProps): JSX.Element {
  const taillePx = `${taille}px`;
  const bordure = `${Math.max(1, Math.floor(taille / 12))}px`;
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      style={{
        display: 'inline-block',
        width: taillePx,
        height: taillePx,
        border: `${bordure} solid var(--color-primary)`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite',
      }}
      className={className}
    >
      <span style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>{ariaLabel}</span>
    </div>
  );
}
