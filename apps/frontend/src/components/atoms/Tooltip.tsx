// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react';
import { PropsBase } from '../types';

interface TooltipProps extends PropsBase {
  /** Contenu de la bulle d'aide. */
  readonly contenu: string;
  /** Element declencheur (enfants). */
  readonly children: React.ReactNode;
  /** Si la bulle est affichage programme (override du survol). */
  readonly ouvert?: boolean;
}

/** Bulle d'aide accessible (role="tooltip", aria-describedby sur le declencheur). */
export function Tooltip({ contenu, children, ouvert = false, className }: TooltipProps): JSX.Element {
  const [estSurvole, setEstSurvole] = useState(false);
  const affiche = ouvert || estSurvole;
  const tooltipId = `tooltip-${Math.random().toString(36).slice(2)}`;

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }} className={className}>
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!affiche}
        style={{
          position: 'absolute',
          top: 'auto',
          left: '50%',
          transform: affiche ? 'translate(-50%, -10px)' : 'translate(-50%, -10px) scale(0)',
          opacity: affiche ? 1 : 0,
          visibility: affiche ? 'visible' : 'hidden',
          padding: `var(--space-xxs) var(--space-s)`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-text-primary)',
          color: 'var(--color-surface)',
          fontSize: 'var(--font-size-caption)',
          lineHeight: 'var(--line-height-caption)',
          whiteSpace: 'nowrap',
          zIndex: 'var(--z-toast)',
          pointerEvents: 'none',
          transition: 'opacity 0.2s, transform 0.2s',
        }}
      >
        {contenu}
      </span>
      <span
        data-testid="tooltip-declencheur"
        onMouseEnter={() => setEstSurvole(true)}
        onMouseLeave={() => setEstSurvole(false)}
        onFocus={() => setEstSurvole(true)}
        onBlur={() => setEstSurvole(false)}
        aria-describedby={affiche ? tooltipId : undefined}
        style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
      >
        {children}
      </span>
    </span>
  );
}
