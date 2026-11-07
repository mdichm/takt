// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { zLock, zSeance, zSeanceList, zSeancesBatch } from '../src/seances';

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID_SALLE = '22222222-2222-4222-8222-222222222222';

describe('contrats des séances et des verrous', () => {
  it('accepte une séance valide', () => {
    expect(
      zSeance.parse({
        versionId: UUID,
        jour: 1,
        creneauDebut: 0,
        nbCreneaux: 2,
      }),
    ).toEqual({
      versionId: UUID,
      jour: 1,
      creneauDebut: 0,
      nbCreneaux: 2,
      salleId: undefined,
      enseignantId: undefined,
      groupeId: undefined,
      activiteId: undefined,
    });
  });

  it.each([
    [{ jour: 0 }, 'Le jour doit être compris entre 1 et 6'],
    [{ jour: 7 }, 'Le jour doit être compris entre 1 et 6'],
    [{ nbCreneaux: 0 }, 'Le nombre de créneaux doit être supérieur à 0'],
  ])('refuse une séance invalide : %s', (correction, message) => {
    const resultat = zSeance.safeParse({
      versionId: UUID,
      jour: 1,
      creneauDebut: 0,
      nbCreneaux: 1,
      ...correction,
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(message);
    }
  });

  it('valide les filtres de liste des séances', () => {
    expect(zSeanceList.parse({ versionId: UUID, jour: '3' })).toEqual({
      versionId: UUID,
      page: 1,
      pageSize: 20,
      jour: 3,
    });
  });

  it('refuse un type de verrou inconnu', () => {
    expect(zLock.safeParse({ seanceId: UUID, type: 'INCONNU' }).success).toBe(false);
  });

  it('refuse deux séances sur le même jour, créneau et salle', () => {
    const seance = {
      versionId: UUID,
      jour: 1,
      creneauDebut: 2,
      nbCreneaux: 1,
      salleId: UUID_SALLE,
    };
    const resultat = zSeancesBatch.safeParse({ seances: [seance, seance] });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(
        'Deux séances ne peuvent pas partager le même jour, le même créneau et la même salle',
      );
    }
  });
});
