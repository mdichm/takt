// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { IGardeCouverture } from '../../common/di/garde-couverture.token';
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

function creerGardeCouvertureMock(): IGardeCouverture {
  return {
    verifierSoumission: vi.fn().mockResolvedValue(undefined),
    calculerCouverture: vi.fn().mockResolvedValue({
      parAffectation: [],
      parDepartement: [],
      tauxGlobal: 0,
      estConforme: true,
      seancesOrphelines: [],
    }),
  } as unknown as IGardeCouverture;
}

function creerService(
  prisma: ReturnType<typeof creerPrismaMock>,
  gardeCouverture: IGardeCouverture = creerGardeCouvertureMock(),
) {
  const auditService = {
    record: vi.fn().mockResolvedValue({}),
  } as unknown as AuditService;

  return {
    service: new WorkflowService(prisma, auditService, gardeCouverture),
    auditService,
    gardeCouverture,
  };
}

describe('WorkflowService (TAKT-L06-02)', () => {
  let prisma: ReturnType<typeof creerPrismaMock>;
  let service: WorkflowService;
  let auditService: AuditService;
  let gardeCouverture: IGardeCouverture;

  beforeEach(() => {
    prisma = creerPrismaMock();
    ({ service, auditService, gardeCouverture } = creerService(prisma));
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

  /*──────────────────────────────────────────────────────────────────────────
    Garde de couverture pédagogique (TAKT-L06-09)
  ───────────────────────────────────────────────────────────────────────────*/

  it('soumettreValidation : garde appelée, transition acceptée si couverture conforme', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'edition',
      semestreId: 'semestre-1',
      datePublication: null,
      publiePar: null,
    });
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'valid_pedag',
      datePublication: null,
      publiePar: null,
    });
    (gardeCouverture.verifierSoumission as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    await service.transitionner(
      VERSION_ID,
      'soumettreValidation',
      'gest',
      {},
      UTILISATEUR_ID,
    );

    expect(gardeCouverture.verifierSoumission).toHaveBeenCalledWith(VERSION_ID);
    expect(prisma.version.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VERSION_ID }, data: { etat: 'valid_pedag' } }),
    );
  });

  it('soumettreValidation : couverture < 100 % → 400, aucune écriture', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'edition',
      semestreId: 'semestre-1',
      datePublication: null,
      publiePar: null,
    });
    (gardeCouverture.verifierSoumission as ReturnType<typeof vi.fn>).mockRejectedValue(
      { code: CODES_ERREUR_API.BAD_REQUEST, status: 400 },
    );

    await expect(
      service.transitionner(
        VERSION_ID,
        'soumettreValidation',
        'gest',
        {},
        UTILISATEUR_ID,
      ),
    ).rejects.toMatchObject({ code: CODES_ERREUR_API.BAD_REQUEST });

    expect(prisma.version.update).not.toHaveBeenCalled();
  });

  it('soumettreValidation : garde non appelée pour les autres transitions', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'brouillon',
      semestreId: 'semestre-1',
      datePublication: null,
      publiePar: null,
    });
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: VERSION_ID,
      etat: 'edition',
      datePublication: null,
      publiePar: null,
    });

    await service.transitionner(VERSION_ID, 'editer', 'gest', {}, UTILISATEUR_ID);

    expect(gardeCouverture.verifierSoumission).not.toHaveBeenCalled();
  });
});
