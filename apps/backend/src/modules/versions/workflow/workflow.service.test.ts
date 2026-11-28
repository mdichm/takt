// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { IGardeCouverture } from '../../common/di/garde-couverture.token';
import { WorkflowService } from './workflow.service';
import { type ActionTransition, type RoleCode, zVersionItem } from '@takt/contracts';
import {
  MATRICE_TRANSITIONS,
  type TransitionRegle,
} from './workflow-matrix';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '88888888-8888-8888-8888-888888888888';
const SEMESTRE_ID = '22222222-2222-2222-2222-222222222222';
const ISO_CREATED = '2026-01-10T08:00:00.000Z';
const ISO_UPDATED = '2026-01-15T09:00:00.000Z';

/** Les 9 champs exigés par le contrat zVersionItem. */
const CHAMPS_ZVERSIONITEM = [
  'id',
  'semestreId',
  'anneeId',
  'etat',
  'snapshotId',
  'datePublication',
  'publiePar',
  'createdAt',
  'updatedAt',
];

/** Retour de findUnique (lecture de garde) : 5 champs, inchangé par ce ticket. */
function versionGarde(etat: string, semestreId: string = SEMESTRE_ID) {
  return {
    id: VERSION_ID,
    etat,
    semestreId,
    datePublication: null,
    publiePar: null,
  };
}

/** Retour de update (transition) : 9 champs du contrat zVersionItem. */
function versionTransition(etatCible: string, anneeId: string = '33333333-3333-3333-3333-333333333333') {
  return {
    id: VERSION_ID,
    semestreId: SEMESTRE_ID,
    anneeId,
    etat: etatCible,
    snapshotId: null,
    datePublication: null,
    publiePar: null,
    createdAt: ISO_CREATED,
    updatedAt: ISO_UPDATED,
  };
}

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

  /*──────────────────────────────────────────────────────────────────────────
    TAKT-L06-11 : contrat de réponse VersionItem (9 champs)
  ───────────────────────────────────────────────────────────────────────────*/

  it('retourne les 9 champs du contrat zVersionItem sur une transition valide', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('brouillon'),
    );
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionTransition('generation'),
    );

    const resultat = await service.transitionner(
      VERSION_ID,
      'lancerGeneration',
      'gest',
      {},
      UTILISATEUR_ID,
    );

    // Le select de l'update doit contenir les 9 champs du contrat.
    expect(prisma.version.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: VERSION_ID },
        select: expect.objectContaining({
          id: true,
          semestreId: true,
          anneeId: true,
          etat: true,
          snapshotId: true,
          datePublication: true,
          publiePar: true,
          createdAt: true,
          updatedAt: true,
        }),
      }),
    );

    // Le résultat retourné contient les 9 champs.
    for (const champ of CHAMPS_ZVERSIONITEM) {
      expect(resultat).toHaveProperty(champ);
    }

    // Le résultat passe la validation Zod du contrat (après sérialisation JSON
    // car Prisma retourne des Date pour createdAt/updatedAt).
    expect(zVersionItem.safeParse(JSON.parse(JSON.stringify(resultat))).success).toBe(
      true,
    );
  });

  it('anneeId, snapshotId et createdAt sont présents dans la réponse (pas de fallback)', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('valide'),
    );
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionTransition('publie'),
    );

    const resultat = await service.transitionner(
      VERSION_ID,
      'publier',
      'gest',
      {},
      UTILISATEUR_ID,
    );

    expect(resultat.anneeId).toBeDefined();
    expect(resultat.snapshotId).toBeDefined();
    expect(resultat.createdAt).toBeDefined();
    expect(resultat.updatedAt).toBeDefined();
    expect(resultat.anneeId).not.toBe('');
    expect(resultat.createdAt).not.toBe('');
    expect(resultat.updatedAt).not.toBe('');
  });

  /*──────────────────────────────────────────────────────────────────────────
    Tests existants (mis à jour : mocks avec 9 champs + assertions select)
  ───────────────────────────────────────────────────────────────────────────*/

  it('applique une transition valide et journalise', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('brouillon'),
    );
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionTransition('generation'),
    );

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
        semestreId: SEMESTRE_ID,
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
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('brouillon'),
    );

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
      semestreId: SEMESTRE_ID,
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
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('valid_pedag'),
    );

    await expect(
      service.transitionner(VERSION_ID, 'rejeterPedagogique', 'rdep', {}, UTILISATEUR_ID),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.BAD_REQUEST,
    });
  });

  it('applique publier et remplit datePublication / publiePar', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('valide'),
    );
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...versionTransition('publie'),
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
    TAKT-L06-11 : matrice rôles × transitions (18 transitions, 4 rôles)
  ───────────────────────────────────────────────────────────────────────────*/

  it.each(MATRICE_TRANSITIONS as TransitionRegle[])(
    'contrat zVersionItem respecté pour "%s" (tous les rôles autorisés)',
    async (regle: TransitionRegle) => {
      const etatSource = regle.from;
      const etatCible = regle.to;

      await Promise.all(
        regle.roles.map((role) => {
          (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
            versionGarde(etatSource),
          );
          (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue(
            versionTransition(etatCible),
          );

          const contexte: { motif?: string; typeMotif?: 'pedagogique' | 'planning' | 'autre' } =
            {};
          if (regle.motifObligatoire) {
            contexte.motif = 'motif de test';
            contexte.typeMotif = 'pedagogique';
          }

          return service
            .transitionner(
              VERSION_ID,
              regle.action as ActionTransition,
              role as RoleCode,
              contexte,
              UTILISATEUR_ID,
            )
            .then((resultat) => {
              // Le résultat contient les 9 champs du contrat.
              for (const champ of CHAMPS_ZVERSIONITEM) {
                expect(resultat).toHaveProperty(champ);
              }
              // Le résultat passe la validation Zod du contrat.
              expect(
                zVersionItem.safeParse(
                  JSON.parse(JSON.stringify(resultat)),
                ).success,
              ).toBe(true);
              expect(resultat.etat).toBe(etatCible);
            });
        }),
      );
    },
  );

  /*──────────────────────────────────────────────────────────────────────────
    Garde de couverture pédagogique (TAKT-L06-09)
  ───────────────────────────────────────────────────────────────────────────*/

  it('soumettreValidation : garde appelée, transition acceptée si couverture conforme', async () => {
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('edition'),
    );
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionTransition('valid_pedag'),
    );
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
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('edition'),
    );
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
    (prisma.version.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionGarde('brouillon'),
    );
    (prisma.version.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      versionTransition('edition'),
    );

    await service.transitionner(VERSION_ID, 'editer', 'gest', {}, UTILISATEUR_ID);

    expect(gardeCouverture.verifierSoumission).not.toHaveBeenCalled();
  });
});
