// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Bouton } from '../atoms/Bouton';
import { Badge } from '../atoms/Badge';
import { Icone, type NomIcone } from '../atoms/Icone';
import { Alerte } from '../atoms/Alerte';

type TypeConflit = 'salle' | 'enseignant' | 'groupe';

interface Conflit {
  readonly id: string;
  readonly type: TypeConflit;
  readonly entiteA: string;
  readonly entiteB: string;
  readonly seance: string;
  readonly gravite: 'bloquant' | 'warning';
}

interface PanneauConflitsProps {
  readonly conflits: readonly Conflit[];
  readonly onResolver: (id: string) => void;
  readonly chargement?: boolean;
}

const LIBELLE_TYPE: Record<TypeConflit, string> = {
  salle: 'Salle',
  enseignant: 'Enseignant',
  groupe: 'Groupe',
};

const ICONE_TYPE: Record<TypeConflit, NomIcone> = {
  salle: 'calendrier',
  enseignant: 'utilisateur',
  groupe: 'utilisateur',
};

/** Panneau listant les conflits de planning (salle/enseignant/groupe) avec actions de résolution. */
export function PanneauConflits({
  conflits,
  onResolver,
  chargement = false,
}: PanneauConflitsProps): JSX.Element {
  if (chargement) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-s)',
          padding: 'var(--space-m)',
        }}
      >
        <span
          role="status"
          aria-label="Chargement des conflits"
          style={{
            width: '20px',
            height: '20px',
            border: '2px solid var(--color-primary)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
          }}
        />
        <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
          Chargement des conflits…
        </span>
      </div>
    );
  }

  if (conflits.length === 0) {
    return (
      <Alerte
        variante="succès"
        titre="Aucun conflit"
        message="Toutes les séances sont planifiées sans conflit."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
      <div
        style={{
          fontSize: 'var(--font-size-caption)',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {conflits.length} conflit{conflits.length > 1 ? 's' : ''} détecté
        {conflits.length > 1 ? 's' : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {conflits.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-s)',
              padding: 'var(--space-s)',
              border: `var(--border-width) solid var(--color-border)`,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
            }}
          >
            <span
              style={{
                color: c.gravite === 'bloquant' ? 'var(--color-error)' : 'var(--color-warning)',
              }}
            >
              <Icone nom={ICONE_TYPE[c.type]} taille={16} ariaLabel={LIBELLE_TYPE[c.type]} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {LIBELLE_TYPE[c.type]} : {c.entiteA} ↔ {c.entiteB}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Séance : {c.seance}
              </div>
            </div>
            <Badge
              variante={c.gravite === 'bloquant' ? 'erreur' : 'attention'}
              libelle={c.gravite}
            />
            <Bouton
              variante="fantome"
              taille="petite"
              libelle="Résoudre"
              disabled={chargement}
              onClick={() => onResolver(c.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
