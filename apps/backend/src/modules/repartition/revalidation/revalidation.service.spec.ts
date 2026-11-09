// Copyright (C) 2026 TAKT
/* eslint-disable @typescript-eslint/no-explicit-any */
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RevalidationService } from './revalidation.service';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { creerHashSHA256 } from '../../common/crypto/hash';

const VERSION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEPARTEMENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const UTILISATEUR_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const AFFECTATIONS = [
  {
    id: 'aff-1',
    enseignantId: 'ens-1',
    matiereId: 'mat-1',
    groupeId: 'grp-1',
    typeEnseignementId: 'type-1',
    volumeHebdo: 4,
    dureeCreneaux: 90,
  },
];

const HASH_AFFECTATIONS = creerHashSHA256({
  versionId: VERSION_ID,
  departementId: DEPARTEMENT_ID,
  affectations: [...AFFECTATIONS].sort((a, b) => a.id.localeCompare(b.id)),
});

function creerPrismaMock(overrides: Record<string, unknown> = {}) {
  const base: Record<string, any> = {
    version: { findUnique: vi.fn<any>() },
    validationRepartition: {
      findMany: vi.fn<any>(),
      findFirst: vi.fn<any>(),
      create: vi.fn<any>(),
      update: vi.fn<any>(),
    },
    affectationPedagogique: { findMany: vi.fn<any>() },
    snapshot: { create: vi.fn<any>(), update: vi.fn<any>() },
  };
  const result: Record<string, any> = { ...base };
  for (const [key, valeur] of Object.entries(overrides)) {
    if (
      base[key] &&
      typeof base[key] === 'object' &&
      typeof valeur === 'object' &&
      !Array.isArray(valeur)
    ) {
      result[key] = { ...base[key], ...valeur };
    } else {
      result[key] = valeur;
    }
  }
  return result as any;
}

function creerRepartitionServiceMock(overrides: Record<string, unknown> = {}) {
  return { validerPerimetre: vi.fn<any>(), ...overrides } as any;
}

function creerNotificationsServiceMock(overrides: Record<string, unknown> = {}) {
  return {
    notifierRevalidationDemandee: vi
      .fn<any>()
      .mockResolvedValue({ count: 1, utilisateurIds: [UTILISATEUR_ID] }),
    notifierRevalidationValidee: vi
      .fn<any>()
      .mockResolvedValue({ count: 1, utilisateurIds: [UTILISATEUR_ID] }),
    ...overrides,
  } as any;
}

function creerService(
  prisma: any,
  repartitionService: any,
  notificationsService: any,
  auditService: any = { record: vi.fn() },
) {
  return new RevalidationService(prisma, auditService, repartitionService, notificationsService);
}

describe('RevalidationService.detecterImpacts (TAKT-L05-05)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retourne 404 quand la version est introuvable', async () => {
    const prisma = creerPrismaMock({ version: { findUnique: vi.fn().mockResolvedValue(null) } });
    const service = creerService(
      prisma,
      creerRepartitionServiceMock(),
      creerNotificationsServiceMock(),
    );
    await expect(service.detecterImpacts(VERSION_ID, UTILISATEUR_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
    });
  });

  it('ne marque aucun département quand aucun n’est en VALIDE', async () => {
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue({ id: VERSION_ID, etat: 'rep_pedag' }) },
      validationRepartition: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'vr-1',
            departementId: DEPARTEMENT_ID,
            etat: 'REVALIDATION_REQUISE',
            hashAffectations: null,
          },
        ]),
      },
    });
    const service = creerService(
      prisma,
      creerRepartitionServiceMock(),
      creerNotificationsServiceMock(),
    );
    const resultat = await service.detecterImpacts(VERSION_ID, UTILISATEUR_ID);
    expect(resultat.departementsImpactes[0]!.etat).toBe('REVALIDATION_REQUISE');
    expect(resultat.notificationsCrees).toBe(0);
    expect(prisma.validationRepartition.update).not.toHaveBeenCalled();
  });
  it('ne notifie pas quand les affectations n’ont pas changé (hash identique)', async () => {
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue({ id: VERSION_ID, etat: 'rep_pedag' }) },
      validationRepartition: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'vr-1',
            departementId: DEPARTEMENT_ID,
            etat: 'VALIDE',
            revision: 1,
            hashAffectations: HASH_AFFECTATIONS,
            snapshotCourantId: 'snap-1',
          },
        ]),
      },
      affectationPedagogique: { findMany: vi.fn().mockResolvedValue(AFFECTATIONS) },
    });
    const service = creerService(
      prisma,
      creerRepartitionServiceMock(),
      creerNotificationsServiceMock(),
    );
    const resultat = await service.detecterImpacts(VERSION_ID, UTILISATEUR_ID);
    expect(resultat.departementsImpactes[0]!.etat).toBe('VALIDE');
    expect(resultat.notificationsCrees).toBe(0);
    expect(prisma.validationRepartition.update).not.toHaveBeenCalled();
  });

  it('marque REVALIDATION_REQUISE, audite et notifie quand les affectations ont changé', async () => {
    const prisma = creerPrismaMock({
      version: { findUnique: vi.fn().mockResolvedValue({ id: VERSION_ID, etat: 'rep_pedag' }) },
      validationRepartition: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'vr-1',
            departementId: DEPARTEMENT_ID,
            etat: 'VALIDE',
            revision: 1,
            hashAffectations: 'ancien-hash',
            snapshotCourantId: 'snap-1',
          },
        ]),
      },
      affectationPedagogique: { findMany: vi.fn().mockResolvedValue(AFFECTATIONS) },
    });
    const auditService = { record: vi.fn().mockResolvedValue({}) };
    const notificationsService = creerNotificationsServiceMock();
    const service = creerService(
      prisma,
      creerRepartitionServiceMock(),
      notificationsService,
      auditService,
    );
    const resultat = await service.detecterImpacts(VERSION_ID, UTILISATEUR_ID);
    expect(resultat.departementsImpactes[0]!.etat).toBe('REVALIDATION_REQUISE');
    expect(resultat.notificationsCrees).toBe(1);
    expect(prisma.validationRepartition.update).toHaveBeenCalledWith({
      where: { id: 'vr-1' },
      data: expect.objectContaining({ etat: 'REVALIDATION_REQUISE' }),
    });
    expect(auditService.record).toHaveBeenCalledTimes(1);
    expect(notificationsService.notifierRevalidationDemandee).toHaveBeenCalledWith(
      DEPARTEMENT_ID,
      VERSION_ID,
    );
  });
});

describe('RevalidationService.revalider (TAKT-L05-05)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retourne 404 quand aucune validation n’existe pour le département', async () => {
    const prisma = creerPrismaMock({
      validationRepartition: { findFirst: vi.fn().mockResolvedValue(null) },
    });
    const service = creerService(
      prisma,
      creerRepartitionServiceMock(),
      creerNotificationsServiceMock(),
    );
    await expect(
      service.revalider(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID),
    ).rejects.toMatchObject({ code: CODES_ERREUR_API.NOT_FOUND });
  });

  it('retourne 409 quand le département n’est pas en REVALIDATION_REQUISE', async () => {
    const prisma = creerPrismaMock({
      validationRepartition: {
        findFirst: vi.fn().mockResolvedValue({ id: 'vr-1', etat: 'VALIDE' }),
      },
    });
    const service = creerService(
      prisma,
      creerRepartitionServiceMock(),
      creerNotificationsServiceMock(),
    );
    await expect(
      service.revalider(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID),
    ).rejects.toMatchObject({ code: CODES_ERREUR_API.CONFLICT });
  });

  it('revalide avec succès : nouveau snapshot, état VALIDE, notification', async () => {
    const nouveauSnapshot = {
      id: 'snap-2',
      revision: 2,
      versionId: VERSION_ID,
      departementId: DEPARTEMENT_ID,
    };
    const prisma = creerPrismaMock({
      validationRepartition: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'vr-1',
          departementId: DEPARTEMENT_ID,
          etat: 'REVALIDATION_REQUISE',
          revision: 1,
          hashAffectations: 'ancien',
          snapshotCourantId: 'snap-1',
        }),
        findMany: vi.fn().mockResolvedValue([{ etat: 'VALIDE' }]),
        update: vi.fn().mockResolvedValue({ id: 'vr-1', revision: 2, etat: 'VALIDE' }),
      },
      snapshot: {
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue(nouveauSnapshot),
      },
    });
    const repartitionService = creerRepartitionServiceMock({
      validerPerimetre: vi.fn().mockResolvedValue({
        affectationsPourSnapshot: AFFECTATIONS,
        resultatCharge: { alertes: [] },
        reglesCharge: { id: 'rs-1', code: 'DEFAUT', version: 1, source: 'DEFAUT' },
        hashAffectations: HASH_AFFECTATIONS,
      }),
    });
    const auditService = { record: vi.fn().mockResolvedValue({}) };
    const notificationsService = creerNotificationsServiceMock();
    const service = creerService(prisma, repartitionService, notificationsService, auditService);

    const resultat = await service.revalider(VERSION_ID, DEPARTEMENT_ID, UTILISATEUR_ID);

    expect(resultat.etat).toBe('VALIDE');
    expect(resultat.revision).toBe(2);
    expect(resultat.snapshotId).toBe('snap-2');
    expect(resultat.snapshotPrecedentId).toBe('snap-1');
    expect(resultat.tousDepartementsValides).toBe(true);
    expect(prisma.snapshot.create).toHaveBeenCalledTimes(1);
    const createCall = prisma.snapshot.create.mock.calls[0]![0]!;
    expect(createCall.data!.revision).toBe(2);
    expect(createCall.data!.estCourant).toBe(true);
    expect(createCall.data!.hash).toBeDefined();
    expect(prisma.snapshot.update).toHaveBeenCalledWith({
      where: { id: 'snap-1' },
      data: { estCourant: false },
    });
    expect(auditService.record).toHaveBeenCalledTimes(2);
    expect(notificationsService.notifierRevalidationValidee).toHaveBeenCalledWith(
      DEPARTEMENT_ID,
      VERSION_ID,
    );
  });
});
