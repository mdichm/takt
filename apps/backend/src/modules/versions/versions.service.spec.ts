// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../common/http/api-error';
import { AuditService } from '../audit/audit.service';
import { VersionsService } from './versions.service';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';
const SEMESTRE_ID = '66666666-6666-6666-6666-666666666666';
const ANNEE_ID = '77777777-7777-7777-7777-777777777777';
const VERSION_ID = '88888888-8888-8888-8888-888888888888';

function creerPrismaMock() {
  return {
    semestre: {
      findUnique: vi.fn(),
    },
    version: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  } as unknown as PrismaClient;
}

function creerService(prisma: ReturnType<typeof creerPrismaMock>) {
  const auditService = {
    record: vi.fn().mockResolvedValue({}),
  } as unknown as AuditService;

  return { service: new VersionsService(prisma, auditService), auditService };
}

describe('VersionsService', () => {
  let prisma: ReturnType<typeof creerPrismaMock>;
  let service: VersionsService;
  let auditService: AuditService;

  beforeEach(() => {
    prisma = creerPrismaMock();
    ({ service, auditService } = creerService(prisma));

    (prisma.semestre.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: SEMESTRE_ID,
      anneeUniversitaireId: ANNEE_ID,
    });
  });

  describe('creer', () => {
    it('crée une version en état brouillon avec anneeId déduit du semestre', async () => {
      (prisma.version.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: VERSION_ID,
        semestreId: SEMESTRE_ID,
        anneeId: ANNEE_ID,
        etat: 'brouillon',
        snapshotId: null,
        datePublication: null,
        publiePar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const resultat = await service.creer({ semestreId: SEMESTRE_ID, etat: 'brouillon' }, UTILISATEUR_ID);

      expect(resultat.etat).toBe('brouillon');
      expect(resultat.anneeId).toBe(ANNEE_ID);
      expect(resultat.datePublication).toBeNull();
      expect(resultat.publiePar).toBeNull();
    });

    it('rejette si anneeId ne correspond pas au semestre', async () => {
      await expect(
        service.creer(
          { semestreId: SEMESTRE_ID, anneeId: '00000000-0000-0000-0000-000000000999', etat: 'brouillon' },
          UTILISATEUR_ID,
        ),
      ).rejects.toMatchObject({
        code: CODES_ERREUR_API.BAD_REQUEST,
      });
    });

    it("rejette la création d'une version publiée quand une autre existe déjà", async () => {
      (prisma.version.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'autre-version-id',
      });

      await expect(
        service.creer(
          { semestreId: SEMESTRE_ID, etat: 'publie' },
          UTILISATEUR_ID,
        ),
      ).rejects.toMatchObject({
        code: CODES_ERREUR_API.CONFLICT,
      });
    });
  });

  describe('verifierModifiable', () => {
    it("refuse une version publiée (immuabilité)", async () => {
      (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: VERSION_ID,
        etat: 'publie',
      });

      await expect(service.verifierModifiable(VERSION_ID)).rejects.toMatchObject({
        code: CODES_ERREUR_API.CONFLICT,
      });
    });

    it("autorise une version non publiée", async () => {
      (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: VERSION_ID,
        etat: 'brouillon',
      });

      await expect(service.verifierModifiable(VERSION_ID)).resolves.toBeUndefined();
    });

    it("refuse une version inexistante", async () => {
      (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.verifierModifiable(VERSION_ID)).rejects.toMatchObject({
        code: CODES_ERREUR_API.NOT_FOUND,
      });
    });
  });

  describe('dupliquer', () => {
    it('duplique une version archivée en état initial', async () => {
      (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: VERSION_ID,
        semestreId: SEMESTRE_ID,
        anneeId: ANNEE_ID,
        etat: 'archive',
      });
      (prisma.version.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.version.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'nouvelle-version-id',
        semestreId: SEMESTRE_ID,
        anneeId: ANNEE_ID,
        etat: 'initial',
        snapshotId: null,
        datePublication: null,
        publiePar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const resultat = await service.dupliquer(VERSION_ID, UTILISATEUR_ID);

      expect(resultat.etat).toBe('initial');
      expect(resultat.semestreId).toBe(SEMESTRE_ID);
      expect(auditService.record).toHaveBeenCalledWith({
        action: 'DUPLICATION',
        utilisateurId: UTILISATEUR_ID,
        entite: 'Version',
        entiteId: 'nouvelle-version-id',
        metadonnees: {
          sourceVersionId: VERSION_ID,
          semestreId: SEMESTRE_ID,
          anneeId: ANNEE_ID,
          etat: 'initial',
        },
      });
    });

    it("refuse de dupliquer une version non archivée", async () => {
      (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: VERSION_ID,
        semestreId: SEMESTRE_ID,
        anneeId: ANNEE_ID,
        etat: 'brouillon',
      });

      await expect(service.dupliquer(VERSION_ID, UTILISATEUR_ID)).rejects.toMatchObject({
        code: CODES_ERREUR_API.CONFLICT,
      });
    });
  });
});