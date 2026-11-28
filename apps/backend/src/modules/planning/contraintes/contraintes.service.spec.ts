// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import { ContraintesService } from './contraintes.service';

interface MockPrisma {
  version: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  contrainte: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  journalAudit: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
}

const VERSION_ID = 'version-1';
const UTILISATEUR = 'utilisateur-1';
const CONTRAINTE_ID = 'contrainte-1';

function creerMockPrisma(): MockPrisma {
  return {
    version: { findUnique: vi.fn() },
    contrainte: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    journalAudit: { create: vi.fn() },
    $transaction: vi.fn(),
  };
}

function creerContrainte(overrides: Partial<{
  id: string;
  versionId: string;
  type: string;
  cibleId: string;
  valeur: string;
  poids: number | null;
  estActif: boolean;
  createdAt: Date;
}> = {}) {
  return {
    id: CONTRAINTE_ID,
    versionId: VERSION_ID,
    type: 'INDISPONIBILITE',
    cibleId: 'enseignant-1',
    valeur: JSON.stringify({ day: 1, slots: [8, 9], allDay: false }),
    poids: 100,
    estActif: true,
    createdAt: new Date('2026-11-17T10:00:00.000Z'),
    ...overrides,
  };
}

describe('ContraintesService (TAKT-L09-06)', () => {
  let service: ContraintesService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = creerMockPrisma();
    service = new ContraintesService(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* LISTER                                                             */
  /* ------------------------------------------------------------------ */

  it('lister : retourne les contraintes paginées avec filtres', async () => {
    const contrainte = creerContrainte();
    prisma.contrainte.findMany.mockResolvedValue([contrainte]);
    prisma.contrainte.count.mockResolvedValue(1);
    // any-justify: mock Prisma $transaction (types complexes, acceptables en test)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as any).mockImplementation(async (calls: any[]) => {
      return [
        await calls[0],
        await calls[1],
      ];
    });

    const resultat = await service.lister({
      versionId: VERSION_ID,
      page: 1,
      pageSize: 20,
    });

    expect(prisma.contrainte.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { versionId: VERSION_ID },
      }),
    );
    expect(resultat.data).toHaveLength(1);
    expect(resultat.meta.total).toBe(1);
  });

  it('lister : filtre par estActif', async () => {
    prisma.contrainte.findMany.mockResolvedValue([]);
    prisma.contrainte.count.mockResolvedValue(0);
    // any-justify: mock Prisma $transaction (types complexes, acceptables en test)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as any).mockImplementation(async (calls: any[]) => {
      return [
        await calls[0],
        await calls[1],
      ];
    });

    await service.lister({ versionId: VERSION_ID, page: 1, pageSize: 20, estActif: true });

    expect(prisma.contrainte.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { versionId: VERSION_ID, estActif: true },
      }),
    );
  });

  /* ------------------------------------------------------------------ */
  /* DETECTER CONFLITS                                                  */
  /* ------------------------------------------------------------------ */

  it('detecterConflits : détecte un doublon exact', async () => {
    const contrainte = creerContrainte({ type: 'INDISPONIBILITE' });
    prisma.contrainte.findMany.mockResolvedValue([
      contrainte,
      { ...contrainte, id: 'contrainte-2' },
    ]);

    const resultat = await service.detecterConflits(VERSION_ID);

    expect(resultat.conflits).toHaveLength(1);
    expect(resultat.conflits[0]!.type).toBe('DOUBLON');
  });

  it('detecterConflits : détecte une contradiction indisponibilité / préférence', async () => {
    const ind = creerContrainte({
      type: 'INDISPONIBILITE',
      valeur: JSON.stringify({ day: 1, slots: [8, 9] }),
    });
    const pref = creerContrainte({
      id: 'contrainte-2',
      type: 'PREFERENCE_CRENEAU',
      valeur: JSON.stringify({ day: 1, slot: 8 }),
    });
    prisma.contrainte.findMany.mockResolvedValue([ind, pref]);

    const resultat = await service.detecterConflits(VERSION_ID);

    expect(resultat.conflits).toHaveLength(1);
    expect(resultat.conflits[0]!.type).toBe('CONTRADICTION');
  });

  it('detecterConflits : pas de conflit si cibles différentes', async () => {
    const ind = creerContrainte({
      type: 'INDISPONIBILITE',
      cibleId: 'enseignant-1',
      valeur: JSON.stringify({ day: 1, slots: [8] }),
    });
    const pref = creerContrainte({
      id: 'contrainte-2',
      type: 'PREFERENCE_CRENEAU',
      cibleId: 'enseignant-2',
      valeur: JSON.stringify({ day: 1, slot: 8 }),
    });
    prisma.contrainte.findMany.mockResolvedValue([ind, pref]);

    const resultat = await service.detecterConflits(VERSION_ID);

    expect(resultat.conflits).toHaveLength(0);
  });

  /* ------------------------------------------------------------------ */
  /* CREER                                                              */
  /* ------------------------------------------------------------------ */

  it('creer : crée une contrainte avec poids canonique par défaut', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
    prisma.contrainte.findFirst.mockResolvedValue(null);
    prisma.contrainte.findMany.mockResolvedValue([]);
    prisma.contrainte.create.mockResolvedValue(creerContrainte());
    prisma.journalAudit.create.mockResolvedValue({});

    const resultat = await service.creer(
      {
        versionId: VERSION_ID,
        type: 'INDISPONIBILITE',
        cibleId: 'enseignant-1',
        valeur: JSON.stringify({ day: 1, slots: [8, 9] }),
      },
      UTILISATEUR,
    );

    expect(prisma.contrainte.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          poids: 100,
          estActif: true,
        }),
      }),
    );
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'CREATION' }),
      }),
    );
    expect(resultat.contrainte.id).toBe(CONTRAINTE_ID);
  });

  it('creer : 404 si la version n existe pas', async () => {
    prisma.version.findUnique.mockResolvedValue(null);

    await expect(
      service.creer(
        {
          versionId: 'version-inexistante',
          type: 'INDISPONIBILITE',
          cibleId: 'enseignant-1',
          valeur: '{}',
        },
        UTILISATEUR,
      ),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
    });
  });

  it('creer : 409 si la version n est pas en brouillon', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'publie' });

    await expect(
      service.creer(
        {
          versionId: VERSION_ID,
          type: 'INDISPONIBILITE',
          cibleId: 'enseignant-1',
          valeur: '{}',
        },
        UTILISATEUR,
      ),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
    });
  });

  it('creer : 409 si doublon exact', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
    prisma.contrainte.findMany.mockResolvedValue([]);
    prisma.contrainte.findFirst.mockResolvedValue(creerContrainte());
    await expect(
      service.creer(
        {
          versionId: VERSION_ID,
          type: 'INDISPONIBILITE',
          cibleId: 'enseignant-1',
          valeur: JSON.stringify({ day: 1, slots: [8] }),
        },
        UTILISATEUR,
      ),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
    });
  });

  it('creer : utilise le poids fourni si présent', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
    prisma.contrainte.findMany.mockResolvedValue([]);
    prisma.contrainte.findFirst.mockResolvedValue(null);
    prisma.contrainte.create.mockResolvedValue(creerContrainte({ poids: 42 }));
    prisma.journalAudit.create.mockResolvedValue({});

    await service.creer(
      {
        versionId: VERSION_ID,
        type: 'PREFERENCE_CRENEAU',
        cibleId: 'enseignant-1',
        valeur: JSON.stringify({ day: 1, slot: 8 }),
        poids: 42,
      },
      UTILISATEUR,
    );

    expect(prisma.contrainte.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ poids: 42 }),
      }),
    );
  });

  /* ------------------------------------------------------------------ */
  /* METTRE A JOUR                                                      */
  /* ------------------------------------------------------------------ */

  it('mettreAJour : modifie le poids et la cible', async () => {
    const existant = creerContrainte();
    prisma.contrainte.findUnique.mockResolvedValue(existant);
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
    prisma.contrainte.findFirst.mockResolvedValue(null);
    prisma.contrainte.update.mockResolvedValue(
      creerContrainte({ poids: 50, cibleId: 'enseignant-2' }),
    );
    prisma.journalAudit.create.mockResolvedValue({});

    const resultat = await service.mettreAJour(
      { id: CONTRAINTE_ID },
      { poids: 50, cibleId: 'enseignant-2' },
      UTILISATEUR,
    );

    expect(prisma.contrainte.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CONTRAINTE_ID },
      }),
    );
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'MODIFICATION' }),
      }),
    );
    expect(resultat.poids).toBe(50);
  });

  it('mettreAJour : 404 si contrainte introuvable', async () => {
    prisma.contrainte.findUnique.mockResolvedValue(null);

    await expect(
      service.mettreAJour({ id: 'inexistant' }, {}, UTILISATEUR),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
    });
  });

  it('mettreAJour : 409 si version publiée', async () => {
    prisma.contrainte.findUnique.mockResolvedValue(creerContrainte());
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'publie' });

    await expect(
      service.mettreAJour({ id: CONTRAINTE_ID }, { poids: 50 }, UTILISATEUR),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
    });
  });

  /* ------------------------------------------------------------------ */
  /* SUPPRIMER                                                          */
  /* ------------------------------------------------------------------ */

  it('supprimer : supprime la contrainte et journalise', async () => {
    const existant = creerContrainte();
    prisma.contrainte.findUnique.mockResolvedValue(existant);
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
    prisma.contrainte.delete.mockResolvedValue(existant);
    prisma.journalAudit.create.mockResolvedValue({});

    await service.supprimer({ id: CONTRAINTE_ID }, UTILISATEUR);

    expect(prisma.contrainte.delete).toHaveBeenCalledWith({
      where: { id: CONTRAINTE_ID },
    });
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'SUPPRESSION' }),
      }),
    );
  });

  it('supprimer : 409 si version publiée', async () => {
    prisma.contrainte.findUnique.mockResolvedValue(creerContrainte());
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID, etat: 'publie' });

    await expect(
      service.supprimer({ id: CONTRAINTE_ID }, UTILISATEUR),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.CONFLICT,
    });
  });
});
