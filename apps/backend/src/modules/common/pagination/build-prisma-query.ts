// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PaginationQuery, SortDirection } from '@takt/contracts';

/** Erreur métier levée lorsqu'un filtre de liste est interdit. */
export class ErreurFiltreListe extends Error {
  constructor(
    readonly champ: string,
    message: string,
  ) {
    super(message);
    this.name = 'ErreurFiltreListe';
  }
}

/** Configuration déclarative d'une liste compatible Prisma. */
export interface ConfigurationRequeteListe<
  TWhere extends object,
  TOrderBy extends object,
> {
  /** Construit le filtre métier de base. */
  where: () => TWhere;
  /** Champs de recherche autorisés et construction de leur filtre. */
  searchFields: Readonly<Record<string, (valeur: string) => TWhere>>;
  /** Champs de tri autorisés et construction de leur ordre. */
  sortFields: Readonly<Record<string, (direction: SortDirection) => TOrderBy>>;
  /** Tri appliqué lorsque l'appelant n'en demande aucun. */
  defaultSort: () => TOrderBy;
  /** Fusionne le filtre de base et les fragments de recherche. */
  mergeWhere?: (base: TWhere, fragments: TWhere[]) => TWhere;
}

/** Requête Prisma paginée construite par le helper transverse. */
export interface RequetePrismaListe<TWhere extends object, TOrderBy extends object> {
  where: TWhere;
  orderBy: TOrderBy;
  skip: number;
  take: number;
}

/**
 * Construit une requête Prisma paginée sans jamais injecter un nom de champ
 * fourni par l'appelant. Seuls les champs déclarés dans la configuration
 * peuvent être utilisés pour la recherche ou le tri.
 */
export function buildPrismaQuery<
  TWhere extends object,
  TOrderBy extends object,
>(
  query: PaginationQuery & {
    search?: string | undefined;
    sortBy?: string | undefined;
    sortDirection?: SortDirection | undefined;
  },
  configuration: ConfigurationRequeteListe<TWhere, TOrderBy>,
): RequetePrismaListe<TWhere, TOrderBy> {
  const base = configuration.where();
  const fragmentsRecherche = query.search
    ? Object.values(configuration.searchFields).map((constructeur) =>
        constructeur(query.search as string),
      )
    : [];

  const where = fragmentsRecherche.length
    ? configuration.mergeWhere
      ? configuration.mergeWhere(base, fragmentsRecherche)
      : ({
          ...base,
          OR: fragmentsRecherche.flatMap((fragment) =>
            'OR' in fragment && Array.isArray(fragment.OR)
              ? fragment.OR
              : [fragment],
          ),
        } as TWhere)
    : base;

  let orderBy = configuration.defaultSort();
  if (query.sortBy !== undefined) {
    const constructeur = configuration.sortFields[query.sortBy];
    if (!constructeur) {
      throw new ErreurFiltreListe('sortBy', 'Le champ de tri n’est pas autorisé');
    }
    orderBy = constructeur(query.sortDirection ?? 'asc');
  }

  return {
    where,
    orderBy,
    skip: ((query.page ?? 1) - 1) * (query.pageSize ?? 20),
    take: query.pageSize ?? 20,
  };
}
