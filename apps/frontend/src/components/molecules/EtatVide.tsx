// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Icone } from '../atoms/Icone';
import { PropsBase } from '../types';

interface EtatVideProps extends PropsBase {
  /** Message affiché. */
  readonly message: string;
  /** Titre optionnel. */
  readonly titre?: string;
  /** Icône à afficher (défaut: aucune). */
  readonly icone?:
    | 'accueil'
    | 'utilisateur'
    | 'calendrier'
    | 'recherche'
    | 'alerte'
    | 'succès'
    | 'info'
    | 'verrou';
}

/** État vide : aucune donnée disponible. */
export function EtatVide({ message, titre, icone, className }: EtatVideProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label={titre ? `${titre}: ${message}` : message}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
      }}
      className={className}
    >
      {icone && <Icone nom={icone} taille={48} aria-hidden />}
      {titre && (
        <h3
          style={{
            fontSize: 'var(--font-size-h3)',
            fontWeight: 600,
            marginBottom: 'var(--space-xs)',
            color: 'var(--color-text-primary)',
          }}
        >
          {titre}
        </h3>
      )}
      <p style={{ fontSize: 'var(--font-size-body)', margin: 0, maxWidth: '400px' }}>{message}</p>
    </div>
  );
}
