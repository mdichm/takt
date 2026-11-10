// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PRISMA } from '../../common/di/prisma.token';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { PlanEtudesService } from './plan-etudes.service';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';
const UUID_PARCOURS = '22222222-2222-4222-8222-222222222222';
const UUID_NIVEAU = '33333333-3333-4333-8333-333333333333';
const UUID_ANNEE = '44444444-4444-4444-8444-444444444444';
const UUID_SEMESTRE = '55555555-5555-4555-8555-555555555555';
const UUID_DEPARTEMENT = '66666666-6666-4666-8666-666666666666';
const UUID_PLAN = '77777777-7777-4777-8777-777777777777';
const UUID_MATIERE = '88888888-8888-4888-8888-888888888888';
const UUID_TYPE = '99999999-9999-4999-8999-999999999999';
const UUID_LIGNE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

type PrismaMock = {
  parcours: { findUnique: ReturnType<typeof vi.fn> };
  niveau: { findUnique: ReturnType<typeof vi.fn> };
  semestre: { findUnique: ReturnType<typeof vi.fn> };
  planEtudes: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  planEtudesMatiere: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  matiere: { findUnique: ReturnType<typeof vi.fn> };
  typeEnseignement: { findUnique: ReturnType<typeof vi.fn> };
  groupe: { findMany: ReturnType<typeof vi.fn> };
  journalAudit: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function creerPrismaMock(overrides: Record<string, unknown> = {}) {
  const base: PrismaMock = {
    parcours: {
      findUnique: vi.fn().mockResolvedValue({
        id: UUID_PARCOURS,
        departement: { id: UUID_DEPARTEMENT },
      }),
    },
    niveau: {
      findUnique: vi.fn().mockResolvedValue({
        id: UUID_NIVEAU,
        parcoursId: UUID_PARCOURS,
      }),
    },
    semestre: {
      findUnique: vi.fn().mockResolvedValue({
        id: UUID_SEMESTRE,
        anneeUniversitaireId: UUID_ANNEE,
      }),
    },
    planEtudes: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    planEtudesMatiere: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    matiere: { findUnique: vi.fn().mockResolvedValue({ id: UUID_MATIERE }) },
    typeEnseignement: {
      findUnique: vi.fn().mockResolvedValue({ id: UUID_TYPE }),
    },
    groupe: { findMany: vi.fn().mockResolvedValue([]) },
    journalAudit: { create: vi.fn().mockResolvedValue({ id: 'audit' }) },
    $transaction: vi.fn().mockImplementation(async (promesses: unknown[]) => {
      const resultats = await Promise.all(promesses as Array<Promise<unknown>>);
      return [resultats[0], resultats[1] ?? 0] as [unknown, number];
    }),
  };
  return { ...base, ...overrides } as PrismaMock;
}

function creerAuditMock() {
  return { record: vi.fn().mockResolvedValue({ id: 'audit' }) };
}

async function creerService(prisma: PrismaMock) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      PlanEtudesService,
      { provide: PRISMA, useValue: prisma },
      { provide: AuditService, useValue: creerAuditMock() },
    ],
  }).compile();
  return moduleRef.get(PlanEtudesService);
}

describe('PlanEtudesService', () => {
  it("crée un plan d'études et journalise", async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: UUID_PLAN,
          parcoursId: UUID_PARCOURS,
          niveauId: UUID_NIVEAU,
          anneeUniversitaireId: UUID_ANNEE,
          semestreId: UUID_SEMESTRE,
          departementId: UUID_DEPARTEMENT,
          niveau: { code: 'L1', libelle: 'Licence 1' },
          parcours: { code: 'INFO', libelle: 'Informatique' },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const audit = creerAuditMock();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlanEtudesService,
        { provide: PRISMA, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    const service = moduleRef.get(PlanEtudesService);

    const resultat = await service.create(
      {
        parcoursId: UUID_PARCOURS,
        niveauId: UUID_NIVEAU,
        anneeUniversitaireId: UUID_ANNEE,
        semestreId: UUID_SEMESTRE,
        departementId: UUID_DEPARTEMENT,
      },
      UTILISATEUR_ID,
    );

    expect(resultat.id).toBe(UUID_PLAN);
    expect(prisma.planEtudes.create).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith({
      action: 'CREATION',
      utilisateurId: UTILISATEUR_ID,
      entite: 'PlanEtudes',
      entiteId: UUID_PLAN,
      metadonnees: expect.objectContaining({ niveauId: UUID_NIVEAU }),
    });
  });

  it("refuse un plan d'études déjà existant (conflit)", async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ id: UUID_PLAN }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    await expect(
      service.create(
        {
          parcoursId: UUID_PARCOURS,
          niveauId: UUID_NIVEAU,
          anneeUniversitaireId: UUID_ANNEE,
          semestreId: UUID_SEMESTRE,
          departementId: UUID_DEPARTEMENT,
        },
        UTILISATEUR_ID,
      ),
    ).rejects.toMatchObject({ code: CODES_ERREUR_API.CONFLICT });
  });

  it("retourne le détail d'un plan avec ses matières", async () => {
    const ligne = {
      id: UUID_LIGNE,
      planEtudesId: UUID_PLAN,
      matiereId: UUID_MATIERE,
      typeEnseignementId: UUID_TYPE,
      volumeHoraire: 30,
      dureeCreneaux: 60,
      coefficient: 2,
      matiere: {
        id: UUID_MATIERE,
        code: 'MATH',
        libelle: 'Maths',
        moduleId: UUID_TYPE,
      },
      typeEnseignement: { id: UUID_TYPE, code: 'CM', libelle: 'Cours magistral' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({
          id: UUID_PLAN,
          parcoursId: UUID_PARCOURS,
          niveauId: UUID_NIVEAU,
          anneeUniversitaireId: UUID_ANNEE,
          semestreId: UUID_SEMESTRE,
          departementId: UUID_DEPARTEMENT,
          planEtudesMatieres: [ligne],
        }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.getOne(UUID_PLAN, [UUID_DEPARTEMENT]);

    expect(resultat.nombreMatieres).toBe(1);
    expect(resultat.volumeTotalHebdomadaire).toBe(30);
    expect(resultat.matieres).toHaveLength(1);
    expect(resultat.matieres[0]?.volumeHoraire).toBe(30);
  });

  it('retourne 403 hors périmètre départemental', async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({
          id: UUID_PLAN,
          departementId: UUID_DEPARTEMENT,
        }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    await expect(service.getOne(UUID_PLAN, ['autre-departement'])).rejects.toMatchObject({
      code: CODES_ERREUR_API.FORBIDDEN,
    });
  });
  it("met à jour un plan d'études", async () => {
    const existant = {
      id: UUID_PLAN,
      parcoursId: UUID_PARCOURS,
      niveauId: UUID_NIVEAU,
      anneeUniversitaireId: UUID_ANNEE,
      semestreId: UUID_SEMESTRE,
      departementId: UUID_DEPARTEMENT,
    };
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue(existant),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ ...existant }),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.update(
      UUID_PLAN,
      { departementId: UUID_DEPARTEMENT },
      UTILISATEUR_ID,
    );

    expect(resultat.id).toBe(UUID_PLAN);
  });

  it('refuse de supprimer un plan contenant des matières (409)', async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({
          id: UUID_PLAN,
          niveauId: UUID_NIVEAU,
          planEtudesMatieres: [{ id: UUID_LIGNE }],
        }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    await expect(service.delete(UUID_PLAN, UTILISATEUR_ID)).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
    });
  });
  it("supprime un plan d'études vide et journalise", async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({
          id: UUID_PLAN,
          niveauId: UUID_NIVEAU,
          planEtudesMatieres: [],
        }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue({ id: UUID_PLAN }),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.delete(UUID_PLAN, UTILISATEUR_ID);

    expect(resultat).toEqual({ id: UUID_PLAN });
    expect(prisma.planEtudes.delete).toHaveBeenCalledWith({
      where: { id: UUID_PLAN },
    });
  });

  it("calcule le volume total d'un plan d'études", async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({
          id: UUID_PLAN,
          planEtudesMatieres: [{ volumeHoraire: 30 }, { volumeHoraire: 45 }, { volumeHoraire: 15 }],
        }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.volumeTotal(UUID_PLAN);

    expect(resultat.volumeTotalHebdomadaire).toBe(90);
    expect(resultat.nombreMatieres).toBe(3);
  });

  it("retourne les groupes héritiers d'un plan d'études", async () => {
    const groupes = [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        code: 'L1-A',
        libelle: 'Groupe A',
        niveauId: UUID_NIVEAU,
      },
    ];
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({ id: UUID_PLAN, niveauId: UUID_NIVEAU }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      groupe: { findMany: vi.fn().mockResolvedValue(groupes) },
    });
    const service = await creerService(prisma);

    const resultat = await service.groupesHerites(UUID_PLAN);

    expect(resultat).toHaveLength(1);
    expect(resultat[0]?.estHéritier).toBe(true);
    expect(resultat[0]?.niveauId).toBe(UUID_NIVEAU);
  });
  it("ajoute une matière à un plan d'études et journalise", async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({ id: UUID_PLAN }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      planEtudesMatiere: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: UUID_LIGNE,
          planEtudesId: UUID_PLAN,
          matiereId: UUID_MATIERE,
          typeEnseignementId: UUID_TYPE,
          volumeHoraire: 30,
          dureeCreneaux: 60,
          coefficient: 2,
          matiere: { id: UUID_MATIERE, code: 'MATH', libelle: 'Maths' },
          typeEnseignement: { id: UUID_TYPE, code: 'CM', libelle: 'Cours magistral' },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.ajouterMatiere(
      UUID_PLAN,
      {
        matiereId: UUID_MATIERE,
        typeEnseignementId: UUID_TYPE,
        volumeHoraire: 30,
        dureeCreneaux: 60,
        coefficient: 2,
      },
      UTILISATEUR_ID,
    );

    expect(resultat.id).toBe(UUID_LIGNE);
    expect(prisma.planEtudesMatiere.create).toHaveBeenCalledTimes(1);
  });
  it('refuse une matière en doublon dans le plan (409)', async () => {
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({ id: UUID_PLAN }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      planEtudesMatiere: {
        findUnique: vi.fn(),
        findFirst: vi.fn().mockResolvedValue({ id: UUID_LIGNE }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    await expect(
      service.ajouterMatiere(
        UUID_PLAN,
        {
          matiereId: UUID_MATIERE,
          typeEnseignementId: UUID_TYPE,
          volumeHoraire: 30,
          dureeCreneaux: 60,
          coefficient: 2,
        },
        UTILISATEUR_ID,
      ),
    ).rejects.toMatchObject({ code: CODES_ERREUR_API.CONFLICT });
  });
  it("liste les matières d'un plan avec pagination", async () => {
    const lignes = [
      {
        id: UUID_LIGNE,
        planEtudesId: UUID_PLAN,
        matiereId: UUID_MATIERE,
        typeEnseignementId: UUID_TYPE,
        volumeHoraire: 30,
        dureeCreneaux: 60,
        coefficient: 2,
        matiere: {
          id: UUID_MATIERE,
          code: 'MATH',
          libelle: 'Maths',
          moduleId: UUID_TYPE,
        },
        typeEnseignement: { id: UUID_TYPE, code: 'CM', libelle: 'Cours magistral' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    const prisma = creerPrismaMock({
      planEtudes: {
        findUnique: vi.fn().mockResolvedValue({ id: UUID_PLAN }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      planEtudesMatiere: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue(lignes),
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.listMatieres(UUID_PLAN, { page: 1, pageSize: 10 });

    expect(resultat.items).toHaveLength(1);
    expect(resultat.meta).toEqual({ page: 1, pageSize: 10, total: 1 });
  });
  it('retourne 404 pour une matière absente ou hors plan', async () => {
    const prisma = creerPrismaMock({
      planEtudesMatiere: {
        findUnique: vi.fn().mockResolvedValue({ id: UUID_LIGNE, planEtudesId: 'autre-plan' }),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    await expect(service.getMatiere(UUID_PLAN, UUID_LIGNE)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
    });
  });

  it("met à jour une matière d'un plan d'études", async () => {
    const existant = {
      id: UUID_LIGNE,
      planEtudesId: UUID_PLAN,
      matiereId: UUID_MATIERE,
      typeEnseignementId: UUID_TYPE,
    };
    const prisma = creerPrismaMock({
      planEtudesMatiere: {
        findUnique: vi.fn().mockResolvedValue(existant),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({
          ...existant,
          volumeHoraire: 45,
          matiere: { id: UUID_MATIERE, code: 'MATH', libelle: 'Maths' },
          typeEnseignement: { id: UUID_TYPE, code: 'CM', libelle: 'CM' },
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        delete: vi.fn(),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.updateMatiere(
      UUID_PLAN,
      UUID_LIGNE,
      { volumeHoraire: 45 },
      UTILISATEUR_ID,
    );

    expect(resultat.volumeHoraire).toBe(45);
  });

  it("supprime une matière d'un plan d'études", async () => {
    const existant = { id: UUID_LIGNE, planEtudesId: UUID_PLAN, matiereId: UUID_MATIERE };
    const prisma = creerPrismaMock({
      planEtudesMatiere: {
        findUnique: vi.fn().mockResolvedValue(existant),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue({ id: UUID_LIGNE }),
      },
    });
    const service = await creerService(prisma);

    const resultat = await service.deleteMatiere(UUID_PLAN, UUID_LIGNE, UTILISATEUR_ID);

    expect(resultat).toEqual({ id: UUID_LIGNE });
    expect(prisma.planEtudesMatiere.delete).toHaveBeenCalledWith({
      where: { id: UUID_LIGNE },
    });
  });
});
