// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { zEvenementApplicatif } from '../src/events';

describe('contrats d’événements', () => {
  it('accepte les quatre types d’événements canoniques', () => {
    const evenements = [
      {
        type: 'generation.progress',
        versionId: '11111111-1111-4111-8111-111111111111',
        progression: 50,
      },
      { type: 'generation.done', versionId: '11111111-1111-4111-8111-111111111111' },
      {
        type: 'export.ready',
        exportId: '22222222-2222-4222-8222-222222222222',
        format: 'xlsx',
        url: '/exports/1',
      },
      {
        type: 'notification',
        notificationId: '33333333-3333-4333-8333-333333333333',
        titre: 'Information',
        message: 'Traitement terminé',
      },
    ];

    for (const evenement of evenements) {
      expect(zEvenementApplicatif.parse(evenement)).toEqual(evenement);
    }
  });

  it('refuse un type inconnu', () => {
    expect(zEvenementApplicatif.safeParse({ type: 'inconnu' }).success).toBe(false);
  });
});
