// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';

interface ItemAriane {
  readonly libelle: string;
  readonly url?: string;
}

interface BreadcrumbProps extends PropsBase {
  /** Items du fil d'ariane (le dernier est la page courante). */
  readonly items: readonly ItemAriane[];
}

/** Fil d'ariane accessible (nav aria-label="breadcrumb", ol > li). */
export function Breadcrumb({ items, className }: BreadcrumbProps): JSX.Element {
  return (
    <nav aria-label="Fil d'ariane" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xxs)' }} className={className}>
      <ol role="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xxs)', listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item, index) => {
          const estDernier = index === items.length - 1;
          return (
            <li key={item.libelle} style={{ display: 'flex', alignItems: 'center' }}>
              {index > 0 && (
                <span style={{ color: 'var(--color-text-disabled)', fontSize: 'var(--font-size-caption)' }}>/</span>
              )}
              {estDernier ? (
                <span aria-current="page" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {item.libelle}
                </span>
              ) : (
                <a href={item.url} style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 'var(--font-size-caption)' }}>
                  {item.libelle}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
