// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { SelectionService } from './selection.service';

const UUID_GEN = '11111111-1111-1111-1111-111111111111';
const UUID_VERSION = '22222222-2222-2222-2222-222222222222';
const UUID_SCENARIO = '33333333-3333-3333-3333-333333333333';
const UUID_AFFECTATION = '44444444-4444-4444-4444-444444444444';
const UUID_CRENEAU = '55555555-5555-5555-5555-555555555555';
const UUID_SALLE = '66666666-6666-6666-6666-666666666666';
const UUID_ENSEIGNANT = '77777777-7777-7777-7777-777777777777';

const placementValide = {
  activityId: UUID_AFFECTATION,
  day: 1,
  slot: 3,
  roomId: UUID_SALLE,
  teacherId: UUID_ENSEIGNANT,
};

type ScenarioDonnee = {
  id: string;
  selectionne?: boolean;
  scoreGlobal?: number;
  placements?: unknown[];
  sousScores?: Record<string, unknown>;
};

function generateurPrisma(
  scenarios: ScenarioDonnee[] = [],
  versionEtat = 'generation',
  generationStatut = 'TERMINEE',
) {
  const scenariosDb = scenarios.map((s) => ({
    id: s.id,
    selectionne: s.selectionne ?? false,
    scoreGlobal: s.scoreGlobal ?? 85,
    placements: s.placements ?? [],
    sousScores: s.sousScores ?? { coverage: 80 },
  }));

  const findUniqueMock = vi.fn(async (args: Record<string, unknown>) => {
    if ((args as { where: { id: string } }).where.id !== UUID_GEN) return null;
    return {
      id: UUID_GEN,
      statut: generationStatut,
      versionId: UUID_VERSION,
      version: { id: UUID_VERSION, etat: versionEtat },
    };
  });

  const findManyMock = vi.fn(async (args: Record<string, unknown>) => {
    if ((args as { where: { generationId: string } }).where.generationId !== UUID_GEN) return [];
    return scenariosDb;
  });

  return {
    prisma: {
      generation: { findUnique: findUniqueMock },
      scenario: { findMany: findManyMock },
      version: { update: vi.fn(async (a: Record<string, unknown>) => ({ id: (a as { where: { id: string } }).where.id, ...(a as { data: Record<string, unknown> }).data })) },
      affectationPedagogique: { findUnique: findUniqueMock },
      creneau: { findFirst: vi.fn(async () => null) },
      seance: { create: vi.fn(async () => ({ id: 's-1' })) },
      verrouSeance: { findMany: vi.fn(async () => []) },
    } as unknown as PrismaClient,
  };
}

function generateurAudit() {
  return { auditService: { record: vi.fn(async () => ({ id: 'audit-1' })) } as unknown as AuditService };
}

describe('SelectionService (TAKT-L07-06)', () => {
  describe('selectionnerScenario — gardes', () => {
    it('refuse 404 si la génération est introuvable', async () => {
      const { prisma } = generateurPrisma([]);
      const { auditService } = generateurAudit();
      const svc = new SelectionService(prisma as unknown as PrismaClient, auditService);

      await expect(svc.selectionnerScenario('inexistant', UUID_SCENARIO, 'user-1'))
        .rejects.toMatchObject({ code: CODES_ERREUR_API.NOT_FOUND, status: 404 });
    });

    it('refuse 404 si le scénario n\'appartient pas à la génération', async () => {
      const { prisma } = generateurPrisma([]);
      const { auditService } = generateurAudit();
      const svc = new SelectionService(prisma as unknown as PrismaClient, auditService);

      await expect(svc.selectionnerScenario(UUID_GEN, 'scenario-inexistant', 'user-1'))
        .rejects.toMatchObject({ code: CODES_ERREUR_API.NOT_FOUND, status: 404 });
    });

    it('refuse 409 si la génération n\'est pas terminée', async () => {
      const { prisma } = generateurPrisma([{ id: UUID_SCENARIO, selectionne: false }], 'generation', 'EN_COURS');
      const { auditService } = generateurAudit();
      const svc = new SelectionService(prisma as unknown as PrismaClient, auditService);

      await expect(svc.selectionnerScenario(UUID_GEN, UUID_SCENARIO, 'user-1'))
        .rejects.toMatchObject({ code: CODES_ERREUR_API.CONFLICT, status: 409 });
    });

    it('refuse 409 si le scénario est déjà sélectionné (idempotence)', async () => {
      const { prisma } = generateurPrisma([{ id: UUID_SCENARIO, selectionne: true }]);
      const { auditService } = generateurAudit();
      const svc = new SelectionService(prisma as unknown as PrismaClient, auditService);

      await expect(svc.selectionnerScenario(UUID_GEN, UUID_SCENARIO, 'user-1'))
        .rejects.toMatchObject({ code: CODES_ERREUR_API.CONFLICT, status: 409 });
    });

    it('refuse 409 si la version n\'est pas en état generation', async () => {
      const { prisma } = generateurPrisma([{ id: UUID_SCENARIO, selectionne: false }], 'edition', 'TERMINEE');
      const { auditService } = generateurAudit();
      const svc = new SelectionService(prisma as unknown as PrismaClient, auditService);

      await expect(svc.selectionnerScenario(UUID_GEN, UUID_SCENARIO, 'user-1'))
        .rejects.toMatchObject({ code: CODES_ERREUR_API.CONFLICT, status: 409 });
    });

    it('refuse 400 si les placements sont invalides', async () => {
      const { prisma } = generateurPrisma([{
        id: UUID_SCENARIO,
        selectionne: false,
        placements: [{ activityId: 'not-a-uuid', day: 99, slot: 99, roomId: 'x', teacherId: 'y' }],
      }]);
      const { auditService } = generateurAudit();
      const svc = new SelectionService(prisma as unknown as PrismaClient, auditService);

      await expect(svc.selectionnerScenario(UUID_GEN, UUID_SCENARIO, 'user-1'))
        .rejects.toMatchObject({ code: CODES_ERREUR_API.BAD_REQUEST, status: 400 });
    });
  });

  describe('selectionnerScenario — succès', () => {
    it('adopte le scénario, crée les séances, passe la version en edition, écrit l\'audit', async () => {
      const creneauMock = {
        id: UUID_CRENEAU, jour: 2, ordre: 4,
        heureDebut: new Date('2026-01-05T10:00:00Z'),
        heureFin: new Date('2026-01-05T10:30:00Z'),
      };
      const affectationMock = {
        id: UUID_AFFECTATION,
        versionId: UUID_VERSION,
        groupeId: '88888888-8888-8888-8888-888888888888',
        matiereId: '99999999-9999-9999-9999-999999999999',
        typeEnseignementId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        dureeCreneaux: 30,
        volumeHebdo: 2,
      };

      const prisma = {
        generation: { findUnique: vi.fn(async () => ({
          id: UUID_GEN, statut: 'TERMINEE', versionId: UUID_VERSION,
          version: { id: UUID_VERSION, etat: 'generation' },
        })) },
        scenario: {
          findMany: vi.fn(async () => [{
            id: UUID_SCENARIO, selectionne: false, scoreGlobal: 85,
            placements: [placementValide], sousScores: { coverage: 85 },
          }]),
          update: vi.fn(async (args: Record<string, unknown>) => ({ id: (args as { where: { id: string } }).where.id, selectionne: true })),
        },
        version: { update: vi.fn(async (args: Record<string, unknown>) => ({ id: (args as { where: { id: string } }).where.id, etat: (args as { data: { etat: string } }).data.etat })) },
        affectationPedagogique: { findUnique: vi.fn(async () => affectationMock) },
        creneau: { findFirst: vi.fn(async () => creneauMock) },
        seance: { create: vi.fn(async () => ({ id: 'seance-1' })) },
        verrouSeance: { findMany: vi.fn(async () => []) },
        $transaction: vi.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
          const tx = {
            affectationPedagogique: prisma.affectationPedagogique,
            creneau: prisma.creneau,
            seance: prisma.seance,
            verrouSeance: prisma.verrouSeance,
            scenario: prisma.scenario,
            version: prisma.version,
          };
          return fn(tx);
        }),
      } as unknown as PrismaClient;

      const auditService = { record: vi.fn(async () => ({ id: 'audit-1' })) } as unknown as AuditService;
      const svc = new SelectionService(prisma, auditService);

      const resultat = await svc.selectionnerScenario(UUID_GEN, UUID_SCENARIO, 'user-1');

      expect(resultat.scenarioId).toBe(UUID_SCENARIO);
      expect(resultat.versionId).toBe(UUID_VERSION);
      expect(resultat.nbSeances).toBe(1);
      expect(resultat.couverture).toBe(85);
      expect(prisma.scenario.update).toHaveBeenCalledWith({
        where: { id: UUID_SCENARIO },
        data: { selectionne: true },
      });
      expect(prisma.version.update).toHaveBeenCalledWith({
        where: { id: UUID_VERSION },
        data: { etat: 'edition' },
      });
      expect(auditService.record).toHaveBeenCalledWith({
        action: 'ADOPTION_SCENARIO',
        utilisateurId: 'user-1',
        entite: 'Scenario',
        entiteId: UUID_SCENARIO,
        metadonnees: expect.objectContaining({
          versionId: UUID_VERSION,
          versionCible: 'edition',
          score: 85,
          nbSeances: 1,
        }),
      });
    });
  });
});