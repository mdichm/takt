// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Bouton } from '../atoms/Bouton';
import { Icone } from '../atoms/Icone';
import { PropsBase } from '../types';

interface EtatErreurProps extends PropsBase {
  /** Message d'erreur. */
  readonly message: string;
  /** Titre optionnel. */
  readonly titre?: string;
  /** Gestionnaire de tentative de nouveau. */
  readonly onReessayer?: () => void;
  /** Libellé du bouton réessayer. */
  readonly libelleReessayer?: string;
}

/** État d'erreur avec message et bouton de nouvelle tentative. */
export function EtatErreur({ message, titre, onReessayer, libelleReessayer = 'Réessayer', className }: EtatErreurProps): JSX.Element {
  return (
    <div
      role="alert"
      aria-label={titre ? `${titre}: ${message}` : message}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        gap: 'var(--space-m)',
        textAlign: 'center',
        color: 'var(--color-text-primary)',
      }}
      className={className}
    >
      <Icone nom="alerte" taille={48} aria-label="Icône d'erreur" />
      {titre && (
        <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, marginBottom: 'var(--space-xs)', color: 'var(--color-error)' }}>
          {titre}
        </h3>
      )}
      <p style={{ fontSize: 'var(--font-size-body)', margin: 0, maxWidth: '400px' }}>{message}</p>
      {onReessayer && (
        <Bouton variante="danger" libelle={libelleReessayer} onClick={onReessayer} />
      )}
    </div>
  );
}
