// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  zLock,
  zLockCreate,
  zLockList,
  zLockParams,
  zPorteeVerrou,
  zTypeVerrou,
  zVerrouIncompatible,
} from '../src/locks';

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID2 = '22222222-2222-4222-8222-222222222222';
const UUID3 = '33333333-3333-4333-8333-333333333333';

const base = { versionId: UUID, valeur: UUID2 };

describe('contrat zTypeVerrou', () => {
  it.each([['CRENEAU'], ['SALLE'], ['ENSEIGNANT'], ['ACTIVITE']])(
    'accepte le type %s',
    (type) => {
      expect(zTypeVerrou.safeParse(type).success).toBe(true);
    },
  );

  it('refuse un type de verrou inconnu', () => {
    expect(zTypeVerrou.safeParse('INCONNU').success).toBe(false);
  });
});

describe('contrat zLockCreate', () => {
  it.each([
    ['CRENEAU', { seanceId: UUID3 }],
    ['SALLE', { seanceId: UUID3 }],
    ['ENSEIGNANT', { seanceId: UUID3 }],
    ['ACTIVITE', { seanceId: UUID3 }],
  ])('accepte une pose individuelle %s avec poids par defaut 100', (type, extra) => {
    const resultat = zLockCreate.safeParse({ ...base, type, ...extra });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.poids).toBe(100);
      expect(resultat.data.seanceId).toBe(UUID3);
      expect(resultat.data.portee).toBeUndefined();
    }
  });
  it.each([
    ['GROUPE', { groupeId: UUID3 }],
    ['ENSEIGNANT', { enseignantId: UUID3 }],
    ['SALLE', { salleId: UUID3 }],
  ])('accepte une pose en masse %s sans seanceId', (cible, cibleData) => {
    const portee = { cible, ...cibleData };
    const resultat = zLockCreate.safeParse({ ...base, type: 'SALLE', portee });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.seanceId).toBeUndefined();
      expect(resultat.data.portee).toMatchObject({ cible, ...cibleData });
      expect(resultat.data.poids).toBe(100);
    }
  });

  it('accepte un poids personnalise', () => {
    const resultat = zLockCreate.safeParse({
      ...base,
      type: 'SALLE',
      poids: 75,
      seanceId: UUID3,
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.poids).toBe(75);
    }
  });

  it.each([
    [{ poids: 0 }, 'Le poids doit être supérieur à 0'],
    [{ poids: -5 }, 'Le poids doit être supérieur à 0'],
    [{ poids: 101 }, 'Le poids ne peut pas dépasser 100'],
  ])('refuse un poids invalide : %s', (correction, message) => {
    const resultat = zLockCreate.safeParse({
      ...base,
      type: 'SALLE',
      seanceId: UUID3,
      ...correction,
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues[0]?.message).toBe(message);
    }
  });

  it('refuse un uuid invalide sur versionId', () => {
    expect(
      zLockCreate.safeParse({
        ...base,
        versionId: 'invalide',
        type: 'SALLE',
        seanceId: UUID3,
      }).success,
    ).toBe(false);
  });

  it('refuse un uuid invalide sur valeur', () => {
    expect(
      zLockCreate.safeParse({
        ...base,
        valeur: 'invalide',
        type: 'SALLE',
        seanceId: UUID3,
      }).success,
    ).toBe(false);
  });

  it('refuse seanceId et portee ensembles', () => {
    const resultat = zLockCreate.safeParse({
      ...base,
      type: 'SALLE',
      seanceId: UUID3,
      portee: { cible: 'GROUPE', groupeId: UUID3 },
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.issues.some((i) => i.path.includes('portee'))).toBe(true);
    }
  });

  it('refuse ni seanceId ni portee', () => {
    expect(zLockCreate.safeParse({ ...base, type: 'SALLE' }).success).toBe(false);
  });

});
describe('contrat zLockParams', () => {
  it('accepte un id uuid valide', () => {
    expect(zLockParams.safeParse({ id: UUID }).success).toBe(true);
  });

  it('refuse un id invalide', () => {
    expect(zLockParams.safeParse({ id: 'invalide' }).success).toBe(false);
  });
});

describe('contrat zLock (representation)', () => {
  it('parse une representation de verrou complete', () => {
    const resultat = zLock.safeParse({
      id: UUID,
      versionId: UUID2,
      seanceId: UUID3,
      utilisateurId: UUID,
      type: 'SALLE',
      valeur: UUID2,
      poids: 100,
      datePose: '2026-11-17T10:00:00.000Z',
    });
    expect(resultat.success).toBe(true);
  });

  it('refuse une datePose invalide', () => {
    expect(
      zLock.safeParse({
        ...base,
        id: UUID,
        seanceId: UUID3,
        posePar: UUID,
        type: 'SALLE',
        valeur: UUID2,
        poids: 100,
        datePose: 'invalide',
      }).success,
    ).toBe(false);
  });
});

describe('contrat zLockList', () => {
  it('valide les filtres de liste des verrous', () => {
    expect(
      zLockList.parse({ versionId: UUID, type: 'SALLE', page: '2', pageSize: '10' }),
    ).toEqual({
      versionId: UUID,
      type: 'SALLE',
      page: 2,
      pageSize: 10,
      sortBy: undefined,
      sortDirection: undefined,
    });
  });
});

describe('contrat zPorteeVerrou', () => {
  it.each([
    ['SEANCE', { seanceId: UUID }],
    ['GROUPE', { groupeId: UUID }],
    ['ENSEIGNANT', { enseignantId: UUID }],
    ['SALLE', { salleId: UUID }],
  ])('accepte la cible %s', (cible, cibleData) => {
    expect(zPorteeVerrou.safeParse({ cible, ...cibleData }).success).toBe(true);
  });

  it('refuse une cible inconnue', () => {
    expect(zPorteeVerrou.safeParse({ cible: 'INCONNU', seanceId: UUID }).success).toBe(false);
  });
});

describe('contrat zVerrouIncompatible', () => {
  it('parse un detail dincompatibilite verrou', () => {
    expect(
      zVerrouIncompatible.safeParse({
        code: 'VERROU_INCOMPATIBLE',
        message: 'Le verrou salle est incompatible avec une contrainte dure.',
        details: {
          seanceId: UUID,
          verrouId: UUID2,
          verrouType: 'SALLE',
          valeurVerrou: UUID3,
          poids: 100,
        },
      }).success,
    ).toBe(true);
  });

  it('refuse un code different de VERROU_INCOMPATIBLE', () => {
    expect(
      zVerrouIncompatible.safeParse({
        code: 'AUTRE',
        message: 'x',
        details: {
          seanceId: UUID,
          verrouId: UUID2,
          verrouType: 'SALLE',
          valeurVerrou: UUID3,
          poids: 100,
        },
      }).success,
    ).toBe(false);
  });
});

