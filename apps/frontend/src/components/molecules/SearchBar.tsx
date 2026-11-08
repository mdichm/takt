// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';
import { Icone } from '../atoms/Icone';
import { Bouton } from '../atoms/Bouton';

interface SearchBarProps extends PropsBase {
  /** Valeur courante de la recherche. */
  readonly value: string;
  /** Gestionnaire de changement. */
  readonly onChange: (valeur: string) => void;
  /** Gestionnaire de soumission. */
  readonly onSearch: (valeur: string) => void;
  /** Placeholder. */
  readonly placeholder?: string;
}

/** Barre de recherche avec icône et bouton de validation. Accessible (role="search"). */
export function SearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Rechercher…',
  id,
  className,
}: SearchBarProps): JSX.Element {
  const searchId = id || 'search-bar';
  return (
    <div
      role="search"
      aria-label="Recherche"
      style={{ display: 'flex', gap: 'var(--space-xxs)', alignItems: 'center' }}
      className={className}
    >
      <Icone nom="recherche" ariaLabel="Icône de recherche" taille={18} />
      <input
        id={searchId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch(value);
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          height: 'var(--input-height)',
          padding: `0 var(--space-s) 0 calc(var(--space-s) + 20px)`,
          border: `var(--border-width) solid var(--color-border)`,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--font-size-body)',
          outline: 'none',
        }}
      />
      <Bouton
        variante="contour"
        taille="petite"
        libelle="Rechercher"
        onClick={() => onSearch(value)}
      />
    </div>
  );
}
