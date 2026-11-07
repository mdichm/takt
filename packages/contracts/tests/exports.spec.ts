// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { zExport } from '../src/versions';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('contrat d’export', () => {
  it.each(['xlsx', 'pdf', 'ics'])('accepte le format %s', (format) => {
    expect(zExport.parse({ versionId: UUID, format })).toEqual({ versionId: UUID, format });
  });

  it('refuse un format inconnu', () => {
    expect(zExport.safeParse({ versionId: UUID, format: 'csv' }).success).toBe(false);
  });
});
