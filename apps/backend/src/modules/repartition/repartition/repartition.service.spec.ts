// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RepartitionService } from './repartition.service';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { creerHashSHA256 } from '../../common/crypto/hash';

const VERSION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEPARTEMENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const UTILISATEUR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SEMESTRE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const VERSION_REP_PEDAG = { id: VERSION_ID, etat: 'rep_pedag', semestreId: SEMESTRE_ID };
const VERSION_BROUILLON = { id: VERSION_ID, etat: 'brouillon', semestreId: SEMESTRE_ID };

const AFFECTATIONS = [
  {
    id: 'aff-1',
    enseignantId: 'ens-1',
    departementId: DEPARTEMENT_ID,
    matiereId: 'mat-1',
    groupeId: 'grp-1',
    typeEnseignementId: 'type-1',
    volumeHebdo: 4,
    dureeCreneaux: 90,
    enseignant: { id: 'ens-1', grade: { code: 'MCF' } },
    matiere: { id: 'mat-1', code: 'MATH' },
    typeEnseignement: { id: 'type-1', code: 'CM' },
    groupe: { id: 'grp-1', niveau: { parcours: { departementId: DEPARTEMENT_ID } } },
  },
];

const PLAN_ETUDES = {
  id: 'plan-1',
  semestreId: SEMESTRE_ID,
  departementId: DEPARTEMENT_ID,
  planEtudesMatieres: [{ matiereId: 'mat-1' }],
};

function creerPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    version: { findUnique: vi.fn<any>() }, // eslint-disable-line @typescript-eslint/no-explicit-any
    snapshot: {
      findFirst: vi.fn<any>(), // eslint-disable-line @typescript-eslint/no-explicit-any
      create: vi.fn<any>(), // eslint-disable-line @typescript-eslint/no-explicit-any
      count: vi.fn<any>(), // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    affectationPedagogique: { findMany: vi.fn<any>() }, // eslint-disable-line @typescript-eslint/no-explicit-any
    planEtudes: { findFirst: vi.fn<any>() }, // eslint-disable-line @typescript-eslint/no-explicit-any
    chargeRuleSet: { findFirst: vi.fn<any>() }, // eslint-disable-line @typescript-eslint/no-explicit-any
    ...overrides,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function creerService(
  prisma: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  auditService: any = { record: vi.fn() }, // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  return new RepartitionService(prisma, auditService);
}

describe('RepartitionService.validerRepartition (TAKT-L05-04)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retourne 404 quand la version est introuvable', async () => {
    const prisma = creerPrismaMock({ version: { findUnique: vi.fn().mockResolvedValue(null) } });
    const service = creerService(prisma);

    await expect(service.validerRepartition(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
    });
  });

  it('retourne 409 quand la version n\'est pas en état rep_pedag', async () => {
    const prisma = creerPrismaMock({ version: { findUnique: vi.fn().mockResolvedValue(VERSION_BROUILLON) } });
    const service = creerService(prisma);

    await expect(service.validerRepartition(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
    });
  });

  it('retourne 400 quand aucune affectation n\'est trouvée', async () => {
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue(VERSION_REP_PEDAG) },
      snapshot: { findFirst: vi.fn().mockResolvedValue(null) },
      affectationPedagogique: { findMany: vi.fn().mockResolvedValue([]) },
    });
    const service = creerService(prisma);

    await expect(service.validerRepartition(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
    });
  });

  it('retourne 400 quand le plan d\'études est manquant', async () => {
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue(VERSION_REP_PEDAG) },
      snapshot: { findFirst: vi.fn().mockResolvedValue(null) },
      affectationPedagogique: { findMany: vi.fn().mockResolvedValue(AFFECTATIONS) },
      planEtudes: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    const service = creerService(prisma);

    await expect(service.validerRepartition(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
    });
  });

  it('retourne 400 quand des matières du plan sont manquantes', async () => {
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue(VERSION_REP_PEDAG) },
      snapshot: { findFirst: vi.fn().mockResolvedValue(null) },
      affectationPedagogique: { findMany: vi.fn().mockResolvedValue(AFFECTATIONS) },
      planEtudes: { findFirst: vi.fn().mockResolvedValue({ ...PLAN_ETUDES, planEtudesMatieres: [{ matiereId: 'mat-1' }, { matiereId: 'mat-2' }] }) },
    });
    const service = creerService(prisma);

    await expect(service.validerRepartition(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
    });
  });

  it('crée le snapshot, écrit l\'audit et retourne les données quand tout est valide', async () => {
    const snapshotCree = { id: 'snap-new', versionId: VERSION_ID, departementId: DEPARTEMENT_ID };
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue(VERSION_REP_PEDAG) },
      snapshot: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(snapshotCree),
        count: vi.fn().mockResolvedValue(0),
      },
      affectationPedagogique: { findMany: vi.fn().mockResolvedValue(AFFECTATIONS) },
      planEtudes: { findFirst: vi.fn().mockResolvedValue(PLAN_ETUDES) },
      chargeRuleSet: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    const auditService = { record: vi.fn().mockResolvedValue({}) };
    const service = creerService(prisma, auditService);

    const resultat = await service.validerRepartition(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID);

    expect(resultat.snapshotId).toBe('snap-new');
    expect(resultat.reglesChargeSource).toBe('DEFAUT');
    expect(resultat.transitionVersBrouillon).toBe(false);

    expect(prisma.snapshot.create).toHaveBeenCalledTimes(1);
    const createCall = prisma.snapshot.create.mock.calls[0][0];
    expect(createCall.data!.versionId).toBe(VERSION_ID);
    expect(createCall.data!.departementId).toBe(DEPARTEMENT_ID);
    expect(createCall.data!.hash).toBe(creerHashSHA256(createCall.data!.donnees));

    expect(auditService.record).toHaveBeenCalledTimes(1);
    const auditCall = auditService.record.mock.calls[0]![0]!;
    expect(auditCall.action).toBe('TRANSITION_ETAT');
    expect(auditCall.entite).toBe('Snapshot');
    expect(auditCall.entiteId).toBe('snap-new');
  });

  it('passe en DEFAUT quand aucun ChargeRuleSet actif', async () => {
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue(VERSION_REP_PEDAG) },
      snapshot: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'snap-2' }),
        count: vi.fn().mockResolvedValue(0),
      },
      affectationPedagogique: { findMany: vi.fn().mockResolvedValue(AFFECTATIONS) },
      planEtudes: { findFirst: vi.fn().mockResolvedValue(PLAN_ETUDES) },
      chargeRuleSet: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    const service = creerService(prisma);

    const resultat = await service.validerRepartition(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID);
    expect(resultat.reglesChargeSource).toBe('DEFAUT');
  });
});