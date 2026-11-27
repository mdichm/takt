// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Modal } from '@/components/molecules/Modal';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import {
  type Conflit,
  type TypeConflit,
} from '@takt/contracts';

const LIBELLE_TYPE_CONFLIT: Record<TypeConflit, string> = {
  ENSEIGNANT: 'Enseignant',
  GROUPE: 'Groupe',
  SALLE: 'Salle',
  CAPACITE: 'Capacite',
  EQUIPEMENT: 'Equipement',
  COMPATIBILITE: 'Compatibilite',
  INDISPONIBILITE: 'Indisponibilite',
  PAUSE: 'Pause',
  REGLE_PEDAGOGIQUE: 'Regle pedagogique',
  VERROU: 'Verrou',
  COVOITURAGE: 'Covoiturage',
  VOEU: 'Voeu',
  DONNEE_MANQUANTE: 'Donnee manquante',
};

function libelleTypeConflit(type: TypeConflit): string {
  return LIBELLE_TYPE_CONFLIT[type] ?? type;
}

interface ConflitModalProps {
  readonly ouvert: boolean;
  readonly onFermer: () => void;
  readonly conflits: readonly Conflit[];
  readonly onConfirmer: () => void;
  readonly chargement?: boolean;
}

const DICO = DICTIONNAIRE_FR.ges.conflits as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

function estBloquant(c: Conflit): boolean {
  return c.severite === 'BLOQUANT';
}

/** Modal affichant les conflits detects avant un deplacement de seance. */
export function ConflitModal({
  ouvert,
  onFermer,
  conflits,
  onConfirmer,
  chargement = false,
}: ConflitModalProps): JSX.Element | null {
  const bloquants = conflits.filter(estBloquant);
  return (
    <Modal
      ouvert={ouvert}
      titre={t('conflitDetecte') ?? 'Conflit détecté'}
      onFermer={onFermer}
      libelleValider={t('forcerPlacement') ?? 'Forcer le placement'}
      onValider={onConfirmer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
        {bloquants.length > 0 && (
          <div
            role="alert"
            style={{
              padding: 'var(--space-s)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-error)',
              color: 'var(--color-surface)',
              fontSize: 'var(--font-size-body)',
            }}
          >
            {t('deplacementBloque') ?? 'Ce déplacement génère des conflits bloquants.'}
          </div>
        )}
        {bloquants.length === 0 && (
          <div
            style={{
              padding: 'var(--space-s)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning)',
              color: 'var(--color-surface)',
              fontSize: 'var(--font-size-body)',
            }}
          >
            {t('conflitsAvertissement') ?? 'Des conflits mineurs ont été détectés.'}
          </div>
        )}
        <div style={{ maxHeight: '30vh', overflowY: 'auto' }}>
          {conflits.map((c) => (
            <div
              key={c.message}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-s)',
                padding: 'var(--space-xs)',
                border: `var(--border-width) solid var(--color-border)`,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)',
              }}
            >
              <span
                style={{
                  color:
                    c.severite === 'BLOQUANT'
                      ? 'var(--color-error)'
                      : 'var(--color-warning)',
                  fontWeight: 600,
                }}
              >
                {estBloquant(c) ? '! ' : '⚠ '}
              </span>
              <span style={{ fontSize: 'var(--font-size-body)', flex: 1 }}>
                {libelleTypeConflit(c.type)} : {c.message}
              </span>
              <span
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                [{c.severite}]
              </span>
            </div>
          ))}
        </div>
        {chargement && (
          <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
            {t('traitementEnCours') ?? 'Traitement en cours…'}
          </div>
        )}
      </div>
    </Modal>
  );
}