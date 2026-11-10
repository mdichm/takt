// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PropsBase } from '../types';

interface Cellule {
  readonly libelle: string;
  readonly valeur: string | number;
}

interface DataTableRowProps extends PropsBase {
  /** Données de la ligne (une par cellule). */
  readonly cellules: readonly Cellule[];
  /** Si la ligne est sélectionnée. */
  readonly selectionnee?: boolean;
}

/** Une ligne de tableau de données. Utilise des éléments sémantiques <tr>/<td>. */
export function DataTableRow({
  cellules,
  selectionnee = false,
  className,
}: DataTableRowProps): JSX.Element {
  return (
    <tr
      role="row"
      aria-selected={selectionnee}
      style={{
        display: 'table-row',
        height: 'var(--table-row-height)',
        borderBottom: `var(--border-width) solid var(--color-divider)`,
        background: selectionnee ? 'var(--color-surface-variant)' : 'transparent',
        color: 'var(--color-text-primary)',
      }}
      className={className}
    >
      {cellules.map((cellule, index) => (
        <td
          key={index}
          role="gridcell"
          style={{
            padding: `0 var(--space-m)`,
            fontSize: 'var(--font-size-body)',
            borderRight:
              index < cellules.length - 1
                ? `var(--border-width) solid var(--color-divider)`
                : 'none',
          }}
        >
          {cellule.valeur}
        </td>
      ))}
    </tr>
  );
}
