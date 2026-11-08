// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase, VarianteBouton, TailleComposant } from '../types';

/** Fond du bouton par variante (jetons design-tokens, 0 couleur en dur). */
const FOND_VARIANTE: Record<VarianteBouton, string> = {
  primaire: 'var(--color-primary)',
  secondaire: 'var(--color-surface)',
  contour: 'transparent',
  fantome: 'transparent',
  danger: 'var(--color-error)',
};

/** Texte du bouton par variante. */
const TEXTE_VARIANTE: Record<VarianteBouton, string> = {
  primaire: 'var(--color-surface)',
  secondaire: 'var(--color-text-primary)',
  contour: 'var(--color-primary)',
  fantome: 'var(--color-text-primary)',
  danger: 'var(--color-surface)',
};

/** Bordure du bouton par variante. */
const BORDURE_VARIANTE: Record<VarianteBouton, string> = {
  primaire: 'transparent',
  secondaire: 'var(--color-border)',
  contour: 'var(--color-primary)',
  fantome: 'transparent',
  danger: 'transparent',
};

/** Hauteur par taille (jeton --input-height ou --button-height). */
const HAUTEUR_TAILLE: Record<TailleComposant, string> = {
  petite: 'var(--input-height)',
  moyenne: 'var(--input-height)',
  grande: 'var(--button-height)',
};

/** Padding horizontal par taille. */
const PADDING_X_TAILLE: Record<TailleComposant, string> = {
  petite: 'var(--space-s)',
  moyenne: 'var(--space-m)',
  grande: 'var(--space-l)',
};

/** Taille de police par taille. */
const FONT_SIZE_TAILLE: Record<TailleComposant, string> = {
  petite: 'var(--font-size-caption)',
  moyenne: 'var(--font-size-button)',
  grande: 'var(--font-size-body)',
};

interface BoutonProps extends PropsBase {
  /** Variante visuelle. */
  readonly variante?: VarianteBouton;
  /** Taille du bouton. */
  readonly taille?: TailleComposant;
  /** Si le bouton est desactive. */
  readonly disabled?: boolean;
  /** Si le bouton est en chargement (affiche un spinner, desactive le clic). */
  readonly chargement?: boolean;
  /** Type HTML du bouton. */
  readonly type?: 'button' | 'submit' | 'reset';
  /** Libellé affiché. */
  readonly libelle: string;
  /** Gestionnaire de clic. */
  readonly onClick?: () => void;
  /** Contenu optionnel (icône, etc.). */
  readonly children?: React.ReactNode;
}

export function Bouton({
  variante = 'primaire',
  taille = 'moyenne',
  disabled = false,
  chargement = false,
  type = 'button',
  libelle,
  onClick,
  className,
}: BoutonProps): JSX.Element {
  const estDesactive = disabled || chargement;
  return (
    <button
      type={type}
      disabled={estDesactive}
      aria-busy={chargement || undefined}
      aria-label={chargement ? `Chargement : ${libelle}` : undefined}
      onClick={estDesactive ? undefined : onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-xxs)',
        minHeight: HAUTEUR_TAILLE[taille],
        padding: `0 ${PADDING_X_TAILLE[taille]}`,
        border: `var(--border-width) solid ${BORDURE_VARIANTE[variante]}`,
        borderRadius: 'var(--radius-md)',
        background: FOND_VARIANTE[variante],
        color: TEXTE_VARIANTE[variante],
        fontSize: FONT_SIZE_TAILLE[taille],
        fontWeight: 500,
        lineHeight: 'var(--line-height-button)',
        cursor: estDesactive ? 'not-allowed' : 'pointer',
        outline: 'none',
        opacity: estDesactive ? 0.6 : 1,
      }}
      className={className}
    >
      {chargement && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
          }}
        >
          <svg
            style={{ animation: 'spin 0.75s linear infinite' }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </span>
      )}
      {!chargement && libelle}
    </button>
  );
}
