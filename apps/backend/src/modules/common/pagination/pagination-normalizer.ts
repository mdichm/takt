// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PaginationQuery } from '@takt/contracts';
import { DonneesPaginees } from '../http/api-envelope';

/** Construit la forme métier paginée reconnue par l'intercepteur d'enveloppe. */
export function construireDonneesPaginees<T>(
  data: T[],
  total: number,
  query: PaginationQuery,
): DonneesPaginees<T> {
  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
    },
  };
}
