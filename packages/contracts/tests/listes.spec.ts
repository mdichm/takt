// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { zSortDirection } from '../src/common';
import { zUserList } from '../src/referentiels';
import { zSeanceList } from '../src/seances';
import { zVersionList } from '../src/versions';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('contrats de filtrage des listes', () => {
  it('normalise la direction de tri', () => {
    expect(zSortDirection.parse('asc')).toBe('asc');
    expect(zSortDirection.parse('desc')).toBe('desc');
    expect(zSortDirection.safeParse('unknown').success).toBe(false);
  });

  it.each([zUserList, zSeanceList, zVersionList])(
    'refuse un champ de tri hors liste blanche',
    (schema) => {
      const resultat = schema.safeParse({
        ...(schema === zSeanceList ? { versionId: UUID } : {}),
        sortBy: 'champInconnu',
        sortDirection: 'asc',
      });
      expect(resultat.success).toBe(false);
      if (!resultat.success) {
        expect(resultat.error.issues[0]?.message).toBe('Le champ de tri n’est pas autorisé');
      }
    },
  );

  it('valide la liste des versions avec ses filtres', () => {
    expect(
      zVersionList.parse({
        page: '2',
        pageSize: '50',
        search: 'brouillon',
        etat: 'brouillon',
        sortBy: 'etat',
        sortDirection: 'desc',
      }),
    ).toEqual({
      page: 2,
      pageSize: 50,
      search: 'brouillon',
      etat: 'brouillon',
      sortBy: 'etat',
      sortDirection: 'desc',
    });
  });

  it('convertit les booléens textuels des filtres de liste', () => {
    expect(zUserList.parse({ estActif: 'true' }).estActif).toBe(true);
    expect(zUserList.parse({ estActif: 'false' }).estActif).toBe(false);
    expect(zUserList.safeParse({ estActif: 'invalide' }).success).toBe(false);
  });

  it('refuse une direction de tri inconnue dans une liste', () => {
    const resultat = zUserList.safeParse({ sortDirection: 'unknown' });
    expect(resultat.success).toBe(false);
  });
});
