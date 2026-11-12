// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  zLock,
  zSeanceCreate,
  zSeanceList,
  zSeancesBatch,
} from '../src/seances';

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID_SALLE = '22222222-2222-4222-8222-222222222222';
const UUID_CRENEAU = '33333333-3333-4333-8333-333333333333';
const UUID_AFFECTATION = '44444444-4444-4444-8444-444444444444';

describe('contrats des séances et des verrous', () => {
  it('accepte une séance de création valide', () => {
    expect(
      zSeanceCreate.parse({
        versionId: UUID,
        jour: 1,
        creneauDebutId: UUID_CRENEAU,
        nbCreneaux: 2,
        affectationId: UUID_AFFECTATION,
      }),
    ).toEqual({
      versionId: UUID,
      jour: 1,
      creneauDebutId: UUID_CRENEAU,
      nbCreneaux: 2,
      salleId: undefined,
      enseignantId: undefined,
      groupeId: undefined,
      matiereId: undefined,
      typeEnseignementId: undefined,
      affectationId: UUID_AFFECTATION,
    });
  });

  it.each([
    [{ jour: 0 }, 'Le jour doit être compris entre 1 et 6'],
    [{ jour: 7 }, 'Le jour doit être compris entre 1 et 6'],
    [{ nbCreneaux: 0 }, 'Le nombre de créneaux doit être supérieur à 0'],
  ])('refuse une séance de création invalide : %s', (correction, message) => {
    const resultat = zSeanceCreate.safeParse({
      versionId: UUID,
      jour: 1,
      creneauDebutId: UUID_CRENEAU,
      nbCreneaux: 1,
      affectationId: UUID_AFFECTATION,
      ...correction,
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(message);
    }
  });

  it('refuse une séance avec un affectationId invalide', () => {
    const resultat = zSeanceCreate.safeParse({
      versionId: UUID,
      jour: 1,
      creneauDebutId: UUID_CRENEAU,
      nbCreneaux: 1,
      affectationId: 'invalide',
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(
        "L'identifiant de l'affectation pédagogique est requis",
      );
    }
  });

  it('refuse une séance avec un creneauDebutId invalide', () => {
    const resultat = zSeanceCreate.safeParse({
      versionId: UUID,
      jour: 1,
      creneauDebutId: 'invalide',
      nbCreneaux: 1,
      affectationId: UUID_AFFECTATION,
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(
        "L'identifiant du créneau de début est requis",
      );
    }
  });

  it('accepte une mise à jour partielle sans affectationId', () => {
    const resultat = zSeanceCreate.safeParse({
      versionId: UUID,
      jour: 1,
      creneauDebutId: UUID_CRENEAU,
      nbCreneaux: 1,
      salleId: UUID_SALLE,
      affectationId: UUID_AFFECTATION,
    });
    expect(resultat.success).toBe(true);
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
      creneauDebutId: UUID_CRENEAU,
      nbCreneaux: 1,
      salleId: UUID_SALLE,
      affectationId: UUID_AFFECTATION,
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
