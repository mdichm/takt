// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { ErreurFiltreListe, buildPrismaQuery } from './build-prisma-query';

interface WhereTest {
  actif?: boolean;
  OR?: Array<{ nom: { contains: string } } | { prenom: { contains: string } }>;
}

type OrderByTest = { nom: 'asc' | 'desc' };

const configuration = {
  where: (): WhereTest => ({ actif: true }),
  searchFields: {
    nom: (valeur: string): WhereTest => ({ OR: [{ nom: { contains: valeur } }] }),
  },
  sortFields: {
    nom: (direction: 'asc' | 'desc'): OrderByTest => ({ nom: direction }),
  },
  defaultSort: (): OrderByTest => ({ nom: 'asc' }),
};

describe('construction des requêtes Prisma paginées', () => {
  it('calcule skip et take à partir de la page demandée', () => {
    expect(buildPrismaQuery({ page: 2, pageSize: 50 }, configuration)).toMatchObject({
      skip: 50,
      take: 50,
    });
  });

  it('applique le tri ascendant par défaut', () => {
    expect(buildPrismaQuery({ page: 1, pageSize: 20 }, configuration).orderBy).toEqual({
      nom: 'asc',
    });
  });

  it('applique un tri déclaré dans la liste blanche', () => {
    expect(
      buildPrismaQuery(
        { page: 1, pageSize: 20, sortBy: 'nom', sortDirection: 'desc' },
        configuration,
      ).orderBy,
    ).toEqual({ nom: 'desc' });
  });

  it('refuse un champ de tri non déclaré', () => {
    expect(() =>
      buildPrismaQuery({ page: 1, pageSize: 20, sortBy: 'email' }, configuration),
    ).toThrow(ErreurFiltreListe);
  });

  it('combine les champs de recherche comme des alternatives', () => {
    const configurationMulti: {
      where: () => WhereTest;
      searchFields: Readonly<Record<string, (valeur: string) => WhereTest>>;
      sortFields: Readonly<Record<string, (direction: 'asc' | 'desc') => OrderByTest>>;
      defaultSort: () => OrderByTest;
    } = {
      where: configuration.where,
      searchFields: {
        nom: configuration.searchFields.nom,
        prenom: (valeur: string): WhereTest => ({
          OR: [{ prenom: { contains: valeur } }],
        }),
      },
      sortFields: configuration.sortFields,
      defaultSort: configuration.defaultSort,
    };

    expect(
      buildPrismaQuery({ page: 1, pageSize: 20, search: 'Alice' }, configurationMulti).where,
    ).toEqual({
      actif: true,
      OR: [{ nom: { contains: 'Alice' } }, { prenom: { contains: 'Alice' } }],
    });
  });

  it('limite la recherche aux champs déclarés', () => {
    expect(
      buildPrismaQuery({ page: 1, pageSize: 20, search: 'Alice' }, configuration).where,
    ).toEqual({ actif: true, OR: [{ nom: { contains: 'Alice' } }] });
  });
});
