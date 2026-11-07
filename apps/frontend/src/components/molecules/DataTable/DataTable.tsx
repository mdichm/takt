// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alerte } from '../../atoms/Alerte';
import { Icone } from '../../atoms/Icone';
import { EtatChargement } from '../EtatChargement';
import { EtatErreur } from '../EtatErreur';
import { EtatVide } from '../EtatVide';
import { Paginator } from '../Paginator';
import { SearchBar } from '../SearchBar';
import { EtatDonnees, PropsBase } from '../../types';
import { ColonneDataTable, MetaPagination, TriDataTable } from './DataTable.types';

export interface DataTableProps<T> extends PropsBase {
  readonly colonnes: readonly ColonneDataTable<T>[];
  readonly donnees: readonly T[];
  readonly etat: EtatDonnees;
  readonly meta?: MetaPagination;
  readonly valeurRecherche?: string;
  readonly messageErreur?: string;
  readonly messageSucces?: string;
  readonly surTri?: (cle: string, direction: 'asc' | 'desc' | null) => void;
  readonly surChangementPage?: (page: number) => void;
  readonly surRecherche?: (valeur: string) => void;
  readonly surReessayer?: () => void;
  readonly actions?: (item: T) => React.ReactNode;
  readonly libelleVide?: string;
  readonly filtrerLocalement?: boolean;
  readonly ariaLabel?: string;
}

function lireValeur<T>(item: T, colonne: ColonneDataTable<T>): string | number {
  if (colonne.acceseur) {
    return colonne.acceseur(item);
  }
  const valeur = (item as Record<string, unknown>)[colonne.cle];
  return typeof valeur === 'string' || typeof valeur === 'number' ? valeur : String(valeur ?? '');
}

/** Map des alignements de colonne vers les valeurs CSS attendues par React (0 valeur en dur hors jetons). */
const ALIGNEMENT_CSS: Record<'gauche' | 'centre' | 'droite', React.CSSProperties['textAlign']> = {
  gauche: 'left',
  centre: 'center',
  droite: 'right',
};

export function DataTable<T>({
  colonnes,
  donnees,
  etat,
  meta,
  valeurRecherche,
  messageErreur,
  messageSucces,
  surTri,
  surChangementPage,
  surRecherche,
  surReessayer,
  actions,
  libelleVide,
  filtrerLocalement = false,
  id,
  className,
  ariaLabel,
}: DataTableProps<T>): JSX.Element {
  const [tri, setTri] = useState<TriDataTable | null>(null);
  const [recherche, setRecherche] = useState(valeurRecherche ?? '');

  useEffect(() => {
    setRecherche(valeurRecherche ?? '');
  }, [valeurRecherche]);

  const donneesAffichées = useMemo(() => {
    if (!filtrerLocalement || !recherche) {
      return donnees;
    }
    const terme = recherche.toLowerCase();
    return donnees.filter((item) =>
      colonnes.some((colonne) => {
        const valeur = lireValeur(item, colonne);
        return String(valeur).toLowerCase().includes(terme);
      }),
    );
  }, [donnees, recherche, filtrerLocalement, colonnes]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      (meta?.total ?? donneesAffichées.length) / ((meta?.pageSize ?? donneesAffichées.length) || 1),
    ),
  );

  const activerTri = useCallback(
    (cle: string) => {
      let direction: 'asc' | 'desc' | null = 'asc';
      if (tri?.cle === cle) {
        direction = tri.direction === 'asc' ? 'desc' : null;
      }
      setTri(direction ? { cle, direction } : null);
      surTri?.(cle, direction);
    },
    [tri, surTri],
  );

  const gererRecherche = useCallback(
    (valeur: string) => {
      setRecherche(valeur);
      if (!filtrerLocalement) {
        surRecherche?.(valeur);
      }
    },
    [filtrerLocalement, surRecherche],
  );

  // États
  if (etat === 'chargement') {
    return <EtatChargement libelle="Chargement de la liste…" />;
  }
  if (etat === 'erreur') {
    return (
      <EtatErreur
        message={messageErreur ?? 'Une erreur est survenue lors du chargement.'}
        titre="Erreur"
        onReessayer={surReessayer ?? (() => {})}
        libelleReessayer="Réessayer"
      />
    );
  }
  if (donneesAffichées.length === 0) {
    return <EtatVide message={libelleVide ?? 'Aucune donnée disponible.'} titre="Aucune donnée" />;
  }

  return (
    <section
      id={id}
      className={className}
      aria-label={ariaLabel ?? 'Liste des éléments'}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}
    >
      {messageSucces && (
        <Alerte variante="succès" titre="Succès" message={messageSucces} fermable />
      )}
      {(surRecherche || filtrerLocalement) && (
        <SearchBar
          value={recherche}
          onChange={gererRecherche}
          onSearch={gererRecherche}
          placeholder="Rechercher…"
        />
      )}
      <table
        role="grid"
        aria-rowcount={donneesAffichées.length}
        aria-colcount={colonnes.length + (actions ? 1 : 0)}
        aria-label="Liste des éléments"
        style={{ width: '100%', borderCollapse: 'collapse' }}
      >
        <caption
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            border: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Liste des éléments
        </caption>
        <thead>
          <tr role="row">
            {colonnes.map((colonne) => (
              <th
                key={colonne.cle}
                scope="col"
                role="columnheader"
                aria-sort={
                  tri?.cle === colonne.cle
                    ? tri.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                style={{
                  textAlign: ALIGNEMENT_CSS[colonne.alignement ?? 'gauche'] ?? 'left',
                  padding: '0 var(--space-m)',
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  borderBottom: 'var(--border-width) solid var(--color-divider)',
                  background: 'var(--color-surface)',
                  cursor: colonne.triable ? 'pointer' : 'default',
                }}
              >
                {colonne.triable ? (
                  <button
                    type="button"
                    onClick={() => activerTri(colonne.cle)}
                    aria-label={`Trier par ${colonne.libelle}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      font: 'inherit',
                      textAlign: 'left',
                      padding: 0,
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-xxs)',
                      cursor: 'pointer',
                    }}
                  >
                    {colonne.libelle}
                    {tri?.cle === colonne.cle && tri.direction === 'asc' && (
                      <Icone nom="chevron-haut" taille={14} ariaLabel="Tri ascendant" />
                    )}
                    {tri?.cle === colonne.cle && tri.direction === 'desc' && (
                      <Icone nom="chevron-bas" taille={14} ariaLabel="Tri descendant" />
                    )}
                  </button>
                ) : (
                  colonne.libelle
                )}
              </th>
            ))}
            {actions && (
              <th
                scope="col"
                role="columnheader"
                style={{ textAlign: 'center', padding: '0 var(--space-m)' }}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {donneesAffichées.map((item, indexLigne) => (
            <tr
              key={indexLigne}
              role="row"
              aria-rowindex={indexLigne + 1}
              style={{ borderBottom: 'var(--border-width) solid var(--color-divider)' }}
            >
              {colonnes.map((colonne) => (
                <td
                  key={colonne.cle}
                  role="gridcell"
                  style={{
                    textAlign: ALIGNEMENT_CSS[colonne.alignement ?? 'gauche'] ?? 'left',
                    padding: '0 var(--space-m)',
                    fontSize: 'var(--font-size-body)',
                    color: 'var(--color-text-primary)',
                    borderRight: 'var(--border-width) solid var(--color-divider)',
                  }}
                >
                  {lireValeur(item, colonne)}
                </td>
              ))}
              {actions && (
                <td role="gridcell" style={{ textAlign: 'center', padding: '0 var(--space-m)' }}>
                  {actions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {meta && (
        <nav
          aria-label="Pagination"
          style={{ marginTop: 'var(--space-xs)', display: 'flex', justifyContent: 'flex-end' }}
        >
          <Paginator
            page={meta.page}
            total={totalPages}
            totalItems={meta.total}
            onChange={(page) => surChangementPage?.(page)}
          />
        </nav>
      )}
    </section>
  );
}
