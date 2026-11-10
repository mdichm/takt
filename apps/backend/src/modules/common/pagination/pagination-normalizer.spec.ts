// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { construireDonneesPaginees } from './pagination-normalizer';

describe('normalisation des données paginées', () => {
  it('construit les métadonnées à partir du total et de la requête', () => {
    expect(construireDonneesPaginees([{ id: '1' }], 150, { page: 2, pageSize: 50 })).toEqual({
      data: [{ id: '1' }],
      meta: { page: 2, pageSize: 50, total: 150 },
    });
  });
});
