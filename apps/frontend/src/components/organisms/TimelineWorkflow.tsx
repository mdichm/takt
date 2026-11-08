// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Badge } from '../atoms/Badge';
import { Icone, type NomIcone } from '../atoms/Icone';

type StatutEtape = 'à faire' | 'en cours' | 'terminé';

interface EtapeWorkflow {
  readonly id: string;
  readonly libelle: string;
  readonly statut: StatutEtape;
  readonly date?: string;
  readonly description?: string;
}

interface TimelineWorkflowProps {
  readonly titre: string;
  readonly etapes: readonly EtapeWorkflow[];
}

const ICONE_STATUT: Record<StatutEtape, NomIcone> = {
  'à faire': 'info',
  'en cours': 'alerte',
  terminé: 'succès',
};

const VARIANTE_STATUT: Record<StatutEtape, 'info' | 'attention' | 'succès'> = {
  'à faire': 'info',
  'en cours': 'attention',
  terminé: 'succès',
};

/** Timeline de workflow : liste d'étapes avec statut, date et description. */
export function TimelineWorkflow({ titre, etapes }: TimelineWorkflowProps): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
      <h3
        style={{
          fontSize: 'var(--font-size-h2)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: 0,
        }}
      >
        {titre}
      </h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-s)',
          borderLeft: `var(--border-width) solid var(--color-border)`,
          paddingLeft: 'var(--space-m)',
        }}
      >
        {etapes.map((e) => (
          <div
            key={e.id}
            style={{
              position: 'relative',
              paddingLeft: 'var(--space-s)',
              marginBottom: 'var(--space-s)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-calc(var(--space-m) + 1px)',
                top: '2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background:
                  e.statut === 'terminé'
                    ? 'var(--color-success)'
                    : e.statut === 'en cours'
                      ? 'var(--color-warning)'
                      : 'var(--color-border)',
              }}
            />
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
                {e.libelle}
              </span>
              <Badge variante={VARIANTE_STATUT[e.statut]} libelle={e.statut} />
              {e.date && (
                <span
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {e.date}
                </span>
              )}
            </div>
            {e.description && (
              <p
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-text-secondary)',
                  margin: 'var(--space-xxs) 0 0 0',
                }}
              >
                {e.description}
              </p>
            )}
            <span
              style={{
                marginLeft: 'var(--space-s)',
                flexShrink: 0,
                color:
                  e.statut === 'terminé'
                    ? 'var(--color-success)'
                    : e.statut === 'en cours'
                      ? 'var(--color-warning)'
                      : 'var(--color-border)',
              }}
            >
              <Icone nom={ICONE_STATUT[e.statut]} taille={14} ariaLabel={e.statut} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
