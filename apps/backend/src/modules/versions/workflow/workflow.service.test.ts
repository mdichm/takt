// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { WorkflowService } from './workflow.service';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '88888888-8888-8888-8888-888888888888';

function creerPrismaMock() {
  return {
    version: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaClient;
}

function creerService(prisma: ReturnType<typeof creerPrismaMock>) {
  const auditService = {
    record: vi.fn().mockResolvedValue({}),
  } as unknown as AuditService;

  return { service: new WorkflowService(prisma, auditService), auditService };
}

describe('WorkflowService (TAKT-L06-02)', () => {
  let prisma: ReturnType<typeof creerPrismaMock>;
  let service: WorkflowService;
  let auditService: AuditService;

  beforeEach(() => {
    prisma = creerPrismaMock();
    ({ service, auditService } = creerService(prisma));
  });

  it('applique une transition valide et journalise', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'brouillon',
      semestreId: 'semestre-1',
      datePublication: null,
      publiePar: null,
    });
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'generation',
      datePublication: null,
      publiePar: null,
    });

    const resultat = await service.transitionner(
      VERSION_ID,
      'lancerGeneration',
      'gest',
      {},
      UTILISATEUR_ID,
    );

    expect(resultat.etat).toBe('generation');
    expect(prisma.version.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VERSION_ID },
        data: { etat: 'generation' },
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith({
      action: 'TRANSITION_ETAT',
      utilisateurId: UTILISATEUR_ID,
      entite: 'Version',
      entiteId: VERSION_ID,
      metadonnees: {
        action: 'lancerGeneration',
        etatSource: 'brouillon',
        etatCible: 'generation',
        role: 'gest',
        motif: null,
        typeMotif: null,
        semestreId: 'semestre-1',
      },
    });
  });

  it('refuse une version inexistante (404)', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.transitionner(VERSION_ID, 'lancerGeneration', 'gest', {}, UTILISATEUR_ID),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
    });
  });

  it('refuse un rôle non autorisé (403)', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'brouillon',
      semestreId: 'semestre-1',
      datePublication: null,
      publiePar: null,
    });

    await expect(
      service.transitionner(VERSION_ID, 'lancerGeneration', 'rdep', {}, UTILISATEUR_ID),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.FORBIDDEN,
    });
  });

  it('refuse une transition interdite depuis l’état (409 avec transitions possibles)', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'publie',
      semestreId: 'semestre-1',
      datePublication: new Date(),
      publiePar: UTILISATEUR_ID,
    });

    await expect(
      service.transitionner(VERSION_ID, 'editer', 'gest', {}, UTILISATEUR_ID),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
    });
  });

  it('refuse un rejet sans motif (400)', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'valid_pedag',
      semestreId: 'semestre-1',
      datePublication: null,
      publiePar: null,
    });

    await expect(
      service.transitionner(VERSION_ID, 'rejeterPedagogique', 'rdep', {}, UTILISATEUR_ID),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
    });
  });

  it('applique publier et remplit datePublication / publiePar', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'valide',
      semestreId: 'semestre-1',
      datePublication: null,
      publiePar: null,
    });
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'publie',
      datePublication: new Date(),
      publiePar: UTILISATEUR_ID,
    });

    const resultat = await service.transitionner(
      VERSION_ID,
      'publier',
      'gest',
      {},
      UTILISATEUR_ID,
    );

    expect(resultat.etat).toBe('publie');
    expect(prisma.version.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VERSION_ID },
        data: {
          etat: 'publie',
          datePublication: expect.any(Date),
          publiePar: UTILISATEUR_ID,
        },
      }),
    );
  });
});
