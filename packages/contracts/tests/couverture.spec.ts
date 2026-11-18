// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  zCouverture,
  zCouvertureAffectation,
  zCouvertureDepartement,
  zCouvertureParams,
  zStatutCouverture,
} from '../src/couverture';

const UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('zStatutCouverture', () => {
  it('accepte les trois statuts', () => {
    expect(zStatutCouverture.safeParse('CONFORME').success).toBe(true);
    expect(zStatutCouverture.safeParse('SOUS_PLANIFICATION').success).toBe(true);
    expect(zStatutCouverture.safeParse('SUR_PLANIFICATION').success).toBe(true);
  });

  it('rejette un statut invalide', () => {
    expect(zStatutCouverture.safeParse('INCONNU').success).toBe(false);
    expect(zStatutCouverture.safeParse('').success).toBe(false);
  });
});

describe('zCouvertureParams', () => {
  it('accepte un UUID valide', () => {
    expect(zCouvertureParams.safeParse({ id: UUID }).success).toBe(true);
  });

  it('rejette un UUID invalide', () => {
    expect(zCouvertureParams.safeParse({ id: 'invalide' }).success).toBe(false);
    expect(zCouvertureParams.safeParse({}).success).toBe(false);
  });
});

describe('zCouvertureAffectation', () => {
  const valide = {
    affectationId: UUID,
    departementId: UUID,
    volumeDeclareMinutes: 600,
    volumePlanifieMinutes: 600,
    taux: 100,
    statut: 'CONFORME' as const,
  };

  it('accepte une affectation conforme', () => {
    expect(zCouvertureAffectation.safeParse(valide).success).toBe(true);
  });

  it('rejette un statut invalide', () => {
    expect(
      zCouvertureAffectation.safeParse({ ...valide, statut: 'INCONNU' }).success,
    ).toBe(false);
  });

  it('rejette un volume négatif', () => {
    expect(
      zCouvertureAffectation.safeParse({
        ...valide,
        volumeDeclareMinutes: -1,
      }).success,
    ).toBe(false);
  });
});

describe('zCouvertureDepartement', () => {
  const valide = {
    departementId: UUID,
    volumeDeclareMinutes: 1200,
    volumePlanifieMinutes: 900,
    taux: 75,
  };

  it('accepte un département valide', () => {
    expect(zCouvertureDepartement.safeParse(valide).success).toBe(true);
  });

  it('rejette un identifiant invalide', () => {
    expect(
      zCouvertureDepartement.safeParse({ ...valide, departementId: 'invalide' })
        .success,
    ).toBe(false);
  });
});

describe('zCouverture', () => {
  const valide = {
    parAffectation: [
      {
        affectationId: UUID,
        departementId: UUID,
        volumeDeclareMinutes: 600,
        volumePlanifieMinutes: 600,
        taux: 100,
        statut: 'CONFORME',
      },
    ],
    parDepartement: [
      {
        departementId: UUID,
        volumeDeclareMinutes: 600,
        volumePlanifieMinutes: 600,
        taux: 100,
      },
    ],
    tauxGlobal: 100,
    estConforme: true,
    seancesOrphelines: [],
  };

  it('accepte un résultat de couverture valide', () => {
    expect(zCouverture.safeParse(valide).success).toBe(true);
  });

  it('rejette un taux global négatif', () => {
    expect(
      zCouverture.safeParse({ ...valide, tauxGlobal: -1 }).success,
    ).toBe(false);
  });

  it('rejette une séance orpheline avec un UUID invalide', () => {
    expect(
      zCouverture.safeParse({
        ...valide,
        seancesOrphelines: ['invalide'],
      }).success,
    ).toBe(false);
  });
});