// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { VerrouService } from './verrous.service';

interface MockPrisma {
  version: { findUnique: ReturnType<typeof vi.fn> };
  seance: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  verrouSeance: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
  journalAudit: { create: ReturnType<typeof vi.fn> };
}

const VERSION_ID = 'version-1';
const UTILISATEUR_A = 'utilisateur-a';
const UTILISATEUR_B = 'utilisateur-b';
const SEANCE_ID = 'seance-1';
const VERROU_ID = 'verrou-1';
const maintenant = new Date('2026-11-17T10:00:00.000Z');

const verrouExistant = {
  id: VERROU_ID,
  versionId: VERSION_ID,
  seanceId: SEANCE_ID,
  utilisateurId: UTILISATEUR_A,
  type: 'SALLE',
  valeur: 'salle-1',
  poids: 100,
  datePose: maintenant,
};

function creerMockPrisma(): MockPrisma {
  return {
    version: { findUnique: vi.fn() },
    seance: { findUnique: vi.fn(), findMany: vi.fn() },
    verrouSeance: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (appels: unknown[]) => Promise.all(appels)),
    journalAudit: { create: vi.fn() },
  };
}

function creerService(prisma: MockPrisma) {
  return new VerrouService(prisma as unknown as PrismaClient);
}

describe('VerrouService (TAKT-L06-08)', () => {
  let prisma: MockPrisma;
  let service: VerrouService;

  beforeEach(() => {
    prisma = creerMockPrisma();
    service = creerService(prisma);
  });

  it('pose un verrou individuel sur une seance et audite', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'initial' });
    prisma.seance.findUnique.mockResolvedValue({ id: SEANCE_ID, versionId: VERSION_ID });
    prisma.verrouSeance.create.mockResolvedValue(verrouExistant);

    const resultat = await service.poserVerrou(
      { versionId: VERSION_ID, type: 'SALLE', valeur: 'salle-1', poids: 100, seanceId: SEANCE_ID },
      UTILISATEUR_A,
    );

    expect(resultat).toHaveLength(1);
    expect(resultat[0]!.id).toBe(VERROU_ID);
    expect(resultat[0]!.type).toBe('SALLE');
    expect(prisma.verrouSeance.create).toHaveBeenCalledWith({
      data: {
        versionId: VERSION_ID,
        seanceId: SEANCE_ID,
        utilisateurId: UTILISATEUR_A,
        type: 'SALLE',
        valeur: 'salle-1',
        poids: 100,
      },
    });
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'POSE_VERROU', utilisateurId: UTILISATEUR_A, entite: 'VerrouSeance' }) }),
    );
  });
  it('pose en masse par portee GROUPE : un verrou par seance ciblee', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
    prisma.seance.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    prisma.verrouSeance.create.mockResolvedValue(verrouExistant);

    const resultat = await service.poserVerrou(
      {
        versionId: VERSION_ID,
        type: 'SALLE',
        valeur: 'salle-1',
        poids: 100,
        portee: { cible: 'GROUPE', groupeId: 'groupe-1' },
      },
      UTILISATEUR_A,
    );

    expect(resultat).toHaveLength(2);
    expect(prisma.seance.findMany).toHaveBeenCalledWith({
      where: { versionId: VERSION_ID, groupeId: 'groupe-1' },
      select: { id: true },
    });
    expect(prisma.verrouSeance.create).toHaveBeenCalledTimes(2);
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'POSE_VERROU', metadonnees: expect.objectContaining({ nbVerrous: 2 }) }) }),
    );
  });

  it('refuse la pose sur une version verrouillee (valid_pedag)', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'valid_pedag' });
    await expect(
      service.poserVerrou(
        { versionId: VERSION_ID, type: 'SALLE', valeur: 'salle-1', poids: 100, seanceId: SEANCE_ID },
        UTILISATEUR_A,
      ),
    ).rejects.toMatchObject({ code: CODES_ERREUR_API.CONFLICT, status: 409 });
  });

  it('refuse la pose quand la seance est introuvable dans la version', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'initial' });
    prisma.seance.findUnique.mockResolvedValue(null);
    await expect(
      service.poserVerrou(
        { versionId: VERSION_ID, type: 'SALLE', valeur: 'salle-1', poids: 100, seanceId: SEANCE_ID },
        UTILISATEUR_A,
      ),
    ).rejects.toMatchObject({ code: CODES_ERREUR_API.NOT_FOUND, status: 404 });
  });

  it('leve un verrou quand l appelant est le poseur et la version ouverte', async () => {
    prisma.verrouSeance.findUnique.mockResolvedValue({ ...verrouExistant, version: { etat: 'initial' } });
    prisma.verrouSeance.delete.mockResolvedValue({ id: VERROU_ID });

    const resultat = await service.leverVerrou(VERROU_ID, UTILISATEUR_A);

    expect(resultat.id).toBe(VERROU_ID);
    expect(prisma.verrouSeance.delete).toHaveBeenCalledWith({ where: { id: VERROU_ID } });
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LEVEE_VERROU', utilisateurId: UTILISATEUR_A }) }),
    );
  });

  it('refuse de lever un verrou introuvable', async () => {
    prisma.verrouSeance.findUnique.mockResolvedValue(null);
    await expect(service.leverVerrou(VERROU_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
      status: 404,
    });
  });

  it('refuse de lever un verrou sur une version verrouillee', async () => {
    prisma.verrouSeance.findUnique.mockResolvedValue({ ...verrouExistant, version: { etat: 'valid_pedag' } });
    await expect(service.leverVerrou(VERROU_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
      status: 409,
    });
  });

  it('refuse de lever un verrou pose par un autre utilisateur', async () => {
    prisma.verrouSeance.findUnique.mockResolvedValue({ ...verrouExistant, version: { etat: 'initial' } });
    await expect(service.leverVerrou(VERROU_ID, UTILISATEUR_B)).rejects.toMatchObject({
      code: CODES_ERREUR_API.FORBIDDEN,
      status: 403,
    });
  });

  it.each([
    null,
    { ...verrouExistant, utilisateurId: UTILISATEUR_B },
    { ...verrouExistant, utilisateurId: UTILISATEUR_A },
  ])('verifierEditionSeance', async (verrou) => {
    prisma.verrouSeance.findFirst.mockResolvedValue(verrou ?? null);
    if (verrou && verrou.utilisateurId === UTILISATEUR_B) {
      await expect(service.verifierEditionSeance(SEANCE_ID, UTILISATEUR_A)).rejects.toMatchObject({
        code: CODES_ERREUR_API.LOCKED,
        status: 423,
      });
    } else {
      await expect(service.verifierEditionSeance(SEANCE_ID, UTILISATEUR_A)).resolves.toBeUndefined();
    }
  });

  it('liste paginee les verrous d une version', async () => {
    prisma.verrouSeance.findMany.mockResolvedValue([verrouExistant]);
    prisma.verrouSeance.count.mockResolvedValue(1);

    const resultat = await service.lister({ page: 1, pageSize: 20, versionId: VERSION_ID });

    expect(resultat.data).toHaveLength(1);
    expect(resultat.data[0]!.id).toBe(VERROU_ID);
    expect(resultat.meta.total).toBe(1);
    expect(prisma.verrouSeance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { versionId: VERSION_ID } }),
    );
  });
});

