// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Bouton } from '../../atoms/Bouton';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import { PropsBase } from '../../types';

interface ConfirmationSuppressionProps extends PropsBase {
  /** Libellé de l’élément à supprimer. */
  readonly libelle: string;
  /** Gestionnaire de confirmation. */
  readonly surConfirmer: () => void;
  /** Gestionnaire d’annulation. */
  readonly surAnnuler: () => void;
  /** Si la suppression est en cours. */
  readonly chargement?: boolean;
}

/** Boîte de confirmation de suppression (affichée en ligne dans la page). */
export function ConfirmationSuppression({
  libelle,
  surConfirmer,
  surAnnuler,
  chargement = false,
  id,
  className,
}: ConfirmationSuppressionProps): JSX.Element {
  const estDesactive = chargement;
  const dict = traduction('bouton') as typeof DICTIONNAIRE_FR['bouton'];
  return (
    <div
      id={id}
      className={className}
      role="alertdialog"
      aria-modal="true"
      aria-label={`Confirmer la suppression de ${libelle}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-m)',
        padding: 'var(--space-xl)',
        textAlign: 'center',
        color: 'var(--color-text-primary)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: `var(--border-width) solid var(--color-divider)`,
      }}
    >
      <p style={{ fontSize: 'var(--font-size-body)', margin: 0, maxWidth: '400px' }}>{libelle}</p>
      <div style={{ display: 'flex', gap: 'var(--space-s)' }}>
        <Bouton
          variante="contour"
          taille="moyenne"
          libelle={dict.annuler}
          onClick={surAnnuler}
        />
        <Bouton
          variante="danger"
          taille="moyenne"
          libelle={dict.supprimer}
          disabled={estDesactive}
          chargement={chargement}
          {...(estDesactive ? {} : { onClick: surConfirmer })}
        />
      </div>
    </div>
  );
}
