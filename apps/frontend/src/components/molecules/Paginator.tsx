// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';
import { Bouton } from '../atoms/Bouton';

interface PaginatorProps extends PropsBase {
  /** Page courante (base 1). */
  readonly page: number;
  /** Nombre total de pages. */
  readonly total: number;
  /** Nombre total d'éléments (optionnel, affiché si présent). */
  readonly totalItems?: number;
  /** Gestionnaire de changement de page. */
  readonly onChange: (page: number) => void;
}

/** Pagination accessible (aria-label, boutons prev/next, numéros de page). */
export function Paginator({
  page,
  total,
  totalItems,
  onChange,
  className,
}: PaginatorProps): JSX.Element {
  const estPremiere = page <= 1;
  const estDerniere = page >= total;
  const totalPages = Math.max(1, total);

  return (
    <nav
      aria-label="Pagination"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
      className={className}
    >
      <Bouton
        variante="contour"
        taille="petite"
        libelle="Précédente"
        disabled={estPremiere}
        onClick={() => !estPremiere && onChange(page - 1)}
      />
      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
        Page {page} sur {totalPages}
        {totalItems !== undefined ? ` (${totalItems} élément${totalItems > 1 ? 's' : ''})` : ''}
      </span>
      <Bouton
        variante="contour"
        taille="petite"
        libelle="Suivante"
        disabled={estDerniere}
        onClick={() => !estDerniere && onChange(page + 1)}
      />
    </nav>
  );
}
