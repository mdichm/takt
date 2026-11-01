// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { zPaginationMeta, zPaginationQuery } from '../src/common';

describe('contrats communs', () => {
  it('applique les valeurs de pagination par défaut', () => {
    expect(zPaginationQuery.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('coerce les paramètres de pagination textuels', () => {
    expect(zPaginationQuery.parse({ page: '2', pageSize: '50' })).toEqual({
      page: 2,
      pageSize: 50,
    });
  });

  it.each([
    [{ page: 0 }, 'La page doit être supérieure à 0'],
    [{ pageSize: 201 }, 'La taille de page ne peut pas dépasser 200'],
  ])('refuse une pagination invalide : %s', (valeur, message) => {
    const resultat = zPaginationQuery.safeParse(valeur);
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(message);
    }
  });

  it('valide les métadonnées paginées', () => {
    expect(
      zPaginationMeta.parse({ page: 1, pageSize: 20, total: 150 }),
    ).toEqual({ page: 1, pageSize: 20, total: 150 });
  });
});
