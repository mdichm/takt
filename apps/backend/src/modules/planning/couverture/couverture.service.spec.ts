// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { CouvertureService } from './couverture.service';

const VERSION_ID = '88888888-8888-8888-8888-888888888888';

function creerPrismaMock() {
  return {
    affectationPedagogique: { findMany: vi.fn() },
    seance: { findMany: vi.fn() },
  };
}

function creerService(prisma: ReturnType<typeof creerPrismaMock>) {
  return new CouvertureService(prisma as unknown as PrismaClient);
}

const moteurMock = vi.fn();

vi.mock('@takt/charge-engine', () => ({
  computeCouverture: moteurMock,
}));

describe('CouvertureService (TAKT-L06-09)', () => {
  let prisma: ReturnType<typeof creerPrismaMock>;
  let service: CouvertureService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = creerPrismaMock();
    service = creerService(prisma);
  });

  it('100 pct : affectation couverte exactement -> estConforme true', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 10 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a1', nbCreneaux: 20, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 600,
          volumePlanifieMinutes: 600,
          taux: 100,
          statut: 'CONFORME',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 600, volumePlanifieMinutes: 600, taux: 100 }],
      tauxGlobal: 100,
      estConforme: true,
      seancesOrphelines: [],
    });

    const resultat = await service.calculerCouverture(VERSION_ID);

    expect(resultat.estConforme).toBe(true);
    expect(resultat.tauxGlobal).toBe(100);
    expect(moteurMock).toHaveBeenCalledWith(
      [{ id: 'a1', departementId: 'd1', volumeHebdo: 10 }],
      [{ id: 's1', affectationId: 'a1', nbCreneaux: 20, dureeCreneauMinutes: 30 }],
    );
  });

  it('97 pct : sous-planification -> estConforme false', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 100 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a1', nbCreneaux: 194, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 6000,
          volumePlanifieMinutes: 5820,
          taux: 97,
          statut: 'SOUS_PLANIFICATION',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 6000, volumePlanifieMinutes: 5820, taux: 97 }],
      tauxGlobal: 97,
      estConforme: false,
      seancesOrphelines: [],
    });

    const resultat = await service.calculerCouverture(VERSION_ID);

    expect(resultat.estConforme).toBe(false);
    expect(resultat.tauxGlobal).toBe(97);
    expect(resultat.parAffectation[0]!.statut).toBe('SOUS_PLANIFICATION');
  });

  it('105 pct : sur-planification -> estConforme false', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 100 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a1', nbCreneaux: 210, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 6000,
          volumePlanifieMinutes: 6300,
          taux: 105,
          statut: 'SUR_PLANIFICATION',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 6000, volumePlanifieMinutes: 6300, taux: 105 }],
      tauxGlobal: 105,
      estConforme: false,
      seancesOrphelines: [],
    });

    const resultat = await service.calculerCouverture(VERSION_ID);

    expect(resultat.estConforme).toBe(false);
    expect(resultat.tauxGlobal).toBe(105);
    expect(resultat.parAffectation[0]!.statut).toBe('SUR_PLANIFICATION');
  });

  it('seance orpheline -> estConforme false', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 10 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a-inexistante', nbCreneaux: 20, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 600,
          volumePlanifieMinutes: 0,
          taux: 0,
          statut: 'SOUS_PLANIFICATION',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 600, volumePlanifieMinutes: 0, taux: 0 }],
      tauxGlobal: 0,
      estConforme: false,
      seancesOrphelines: ['s1'],
    });

    const resultat = await service.calculerCouverture(VERSION_ID);

    expect(resultat.estConforme).toBe(false);
    expect(resultat.seancesOrphelines).toEqual(['s1']);
  });

  it('echec du moteur -> ApiError 500 INTERNAL_ERROR', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([]);
    prisma.seance.findMany.mockResolvedValue([]);
    moteurMock.mockImplementation(() => {
      throw new Error('moteur HS');
    });

    await expect(service.calculerCouverture(VERSION_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.INTERNAL,
      status: 500,
    });
  });

  /*----------------------------------------------------------------------
    Garde verifierSoumission
  ----------------------------------------------------------------------*/

  it('verifierSoumission : couverture conforme -> resolu sans erreur', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 10 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a1', nbCreneaux: 20, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 600,
          volumePlanifieMinutes: 600,
          taux: 100,
          statut: 'CONFORME',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 600, volumePlanifieMinutes: 600, taux: 100 }],
      tauxGlobal: 100,
      estConforme: true,
      seancesOrphelines: [],
    });

    await expect(service.verifierSoumission(VERSION_ID)).resolves.toBeUndefined();
  });

  it('verifierSoumission : couverture 97 pct -> ApiError 400 VALIDATION_ERROR', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 100 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a1', nbCreneaux: 194, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 6000,
          volumePlanifieMinutes: 5820,
          taux: 97,
          statut: 'SOUS_PLANIFICATION',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 6000, volumePlanifieMinutes: 5820, taux: 97 }],
      tauxGlobal: 97,
      estConforme: false,
      seancesOrphelines: [],
    });

    await expect(service.verifierSoumission(VERSION_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
      status: 400,
    });
  });

  it('verifierSoumission : couverture 105 pct -> ApiError 400 VALIDATION_ERROR', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 100 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a1', nbCreneaux: 210, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 6000,
          volumePlanifieMinutes: 6300,
          taux: 105,
          statut: 'SUR_PLANIFICATION',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 6000, volumePlanifieMinutes: 6300, taux: 105 }],
      tauxGlobal: 105,
      estConforme: false,
      seancesOrphelines: [],
    });

    await expect(service.verifierSoumission(VERSION_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
      status: 400,
    });
  });

  it('verifierSoumission : seance orpheline -> ApiError 400', async () => {
    prisma.affectationPedagogique.findMany.mockResolvedValue([
      { id: 'a1', departementId: 'd1', volumeHebdo: 10 },
    ]);
    prisma.seance.findMany.mockResolvedValue([
      { id: 's1', affectationId: 'a-inexistante', nbCreneaux: 20, creneauDebut: { dureeMinutes: 30 } },
    ]);
    moteurMock.mockReturnValue({
      parAffectation: [
        {
          affectationId: 'a1',
          departementId: 'd1',
          volumeDeclareMinutes: 600,
          volumePlanifieMinutes: 0,
          taux: 0,
          statut: 'SOUS_PLANIFICATION',
        },
      ],
      parDepartement: [{ departementId: 'd1', volumeDeclareMinutes: 600, volumePlanifieMinutes: 0, taux: 0 }],
      tauxGlobal: 0,
      estConforme: false,
      seancesOrphelines: ['s1'],
    });

    await expect(service.verifierSoumission(VERSION_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
      status: 400,
    });
  });
});
