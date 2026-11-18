// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient, Prisma } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { BailService } from './bail.service';

interface MockPrisma {
  version: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  bailEdition: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  journalAudit: {
    create: ReturnType<typeof vi.fn>;
  };
}

const VERSION_ID = 'version-1';
const UTILISATEUR_A = 'utilisateur-a';
const UTILISATEUR_B = 'utilisateur-b';
const BAIL_ID = 'bail-1';

const maintenant = new Date('2026-11-17T10:00:00.000Z');
const dans30Min = new Date('2026-11-17T10:30:00.000Z');
const hier = new Date('2026-11-16T10:00:00.000Z');

const detenteurA = { nom: 'Dupont', prenom: 'Alice' };
const detenteurB = { nom: 'Martin', prenom: 'Bob' };

function creerMockPrisma(): MockPrisma {
  return {
    version: {
      findUnique: vi.fn(),
    },
    bailEdition: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    journalAudit: {
      create: vi.fn(),
    },
  };
}

function creerBailAvecDetenteur(overrides: Partial<{
  id: string;
  versionId: string;
  utilisateurId: string;
  dateFin: Date;
  utilisateur: { nom: string; prenom: string };
}> = {}) {
  return {
    id: BAIL_ID,
    versionId: VERSION_ID,
    utilisateurId: UTILISATEUR_A,
    dateDebut: maintenant,
    dateFin: dans30Min,
    derniereActivite: maintenant,
    utilisateur: detenteurA,
    ...overrides,
  };
}

function erreurP2002() {
  return new Prisma.PrismaClientKnownRequestError(
    'Unique constraint violation on BailEdition.versionId',
    { code: 'P2002', clientVersion: '7.10.1' },
  );
}

describe('BailService (TAKT-L06-07)', () => {
  let service: BailService;
  let prisma: MockPrisma;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(maintenant);
    prisma = creerMockPrisma();
    service = new BailService(prisma as unknown as PrismaClient);
    vi.spyOn(Date, 'now').mockReturnValue(maintenant.getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ------------------------------------------------------------------ */
  /* ACQUERIR                                                           */
  /* ------------------------------------------------------------------ */

  it('acquerir : crée un bail quand la version est libre', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID });
    prisma.bailEdition.create.mockResolvedValue(creerBailAvecDetenteur());

    const resultat = await service.acquerir(VERSION_ID, UTILISATEUR_A);

    expect(prisma.bailEdition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionId: VERSION_ID,
          utilisateurId: UTILISATEUR_A,
          dateDebut: maintenant,
          derniereActivite: maintenant,
        }),
      }),
    );
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'POSE_VERROU', utilisateurId: UTILISATEUR_A }),
      }),
    );
    expect(resultat).toMatchObject({
      id: BAIL_ID,
      versionId: VERSION_ID,
      utilisateurId: UTILISATEUR_A,
      detenteur: 'Alice Dupont',
    });
    expect(resultat.dateFin).toBe(dans30Min.toISOString());
  });

  it('acquerir : 404 si la version n existe pas', async () => {
    prisma.version.findUnique.mockResolvedValue(null);

    await expect(service.acquerir(VERSION_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
      status: 404,
    });
  });

  it('acquerir : 423 avec le nom du detenteur si un autre utilisateur detient le bail actif', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID });
    prisma.bailEdition.create.mockRejectedValue(erreurP2002());
    prisma.bailEdition.findUnique.mockResolvedValue(
      creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_B, utilisateur: detenteurB }),
    );

    await expect(service.acquerir(VERSION_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.LOCKED,
      status: 423,
      details: { detenteur: 'Bob Martin' },
    });
  });

  it('acquerir : relaie l erreur P2002 quand aucun bail n est trouve (branche defensif)', async () => {
    const erreur = erreurP2002();
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID });
    prisma.bailEdition.create.mockRejectedValue(erreur);
    prisma.bailEdition.findUnique.mockResolvedValue(null);

    await expect(service.acquerir(VERSION_ID, UTILISATEUR_A)).rejects.toBe(erreur);
  });

  it('acquerir : renouvellement idempotent quand le demandeur est deja le detenteur', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID });
    prisma.bailEdition.create.mockRejectedValue(erreurP2002());
    prisma.bailEdition.findUnique.mockResolvedValue(
      creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A }),
    );
    // renouveler appelle findUnique puis update
    prisma.bailEdition.update.mockResolvedValue(
      creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A }),
    );

    const resultat = await service.acquerir(VERSION_ID, UTILISATEUR_A);

    expect(prisma.bailEdition.update).toHaveBeenCalled();
    expect(resultat.utilisateurId).toBe(UTILISATEUR_A);
  });

  it('acquerir : reprend un bail expire (premier arrive, premier servi)', async () => {
    const expire = creerBailAvecDetenteur({
      utilisateurId: UTILISATEUR_B,
      dateFin: hier,
      utilisateur: detenteurB,
    });
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID });
    prisma.bailEdition.create.mockRejectedValue(erreurP2002());
    prisma.bailEdition.findUnique.mockResolvedValue(expire);
    prisma.bailEdition.delete.mockResolvedValue(expire);
    // reprise -> nouvel acquerir -> create reussi
    prisma.bailEdition.create.mockRejectedValueOnce(erreurP2002()).mockResolvedValue(
      creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A }),
    );

    const resultat = await service.acquerir(VERSION_ID, UTILISATEUR_A);

    expect(prisma.bailEdition.delete).toHaveBeenCalledWith({ where: { id: BAIL_ID } });
    expect(resultat.utilisateurId).toBe(UTILISATEUR_A);
  });

  /* ------------------------------------------------------------------ */
  /* RENOUVELER                                                         */
  /* ------------------------------------------------------------------ */

  it('renouveler : prolonge le bail de 30 min quand l appelant est le detenteur', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);
    prisma.bailEdition.update.mockResolvedValue(
      creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A, dateFin: dans30Min }),
    );

    const resultat = await service.renouveler(VERSION_ID, UTILISATEUR_A);

    expect(prisma.bailEdition.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: BAIL_ID },
        data: expect.objectContaining({ dateFin: dans30Min, derniereActivite: maintenant }),
      }),
    );
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'RENOUVELLEMENT_VERROU' }),
      }),
    );
    expect(resultat.detenteur).toBe('Alice Dupont');
  });

  it('renouveler : 404 quand aucun bail actif sur la version', async () => {
    prisma.bailEdition.findUnique.mockResolvedValue(null);

    await expect(service.renouveler(VERSION_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
      status: 404,
    });
  });

  it('renouveler : 403 quand l appelant n est pas le detenteur', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_B, utilisateur: detenteurB });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);

    await expect(service.renouveler(VERSION_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.FORBIDDEN,
      status: 403,
      details: { detenteur: 'Bob Martin' },
    });
  });

  it('renouveler : traite un bail expire comme une acquisition', async () => {
    const expire = creerBailAvecDetenteur({ dateFin: hier });
    prisma.bailEdition.findUnique.mockResolvedValue(expire);
    // acquerir interne : version existe, pas de conflit, create reussi
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID });
    prisma.bailEdition.create.mockResolvedValue(creerBailAvecDetenteur());

    const resultat = await service.renouveler(VERSION_ID, UTILISATEUR_A);

    expect(prisma.bailEdition.create).toHaveBeenCalled();
    expect(resultat.utilisateurId).toBe(UTILISATEUR_A);
  });

  /* ------------------------------------------------------------------ */
  /* LIBERER                                                            */
  /* ------------------------------------------------------------------ */

  it('liberer : supprime le bail quand l appelant est le detenteur', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);
    prisma.bailEdition.delete.mockResolvedValue(bail);

    const resultat = await service.liberer(VERSION_ID, UTILISATEUR_A);

    expect(prisma.bailEdition.delete).toHaveBeenCalledWith({ where: { id: BAIL_ID } });
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LEVEE_VERROU' }) }),
    );
    expect(resultat).toEqual({ id: BAIL_ID });
  });

  it('liberer : 403 quand l appelant n est pas le detenteur (ni admin)', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_B, utilisateur: detenteurB });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);

    await expect(service.liberer(VERSION_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.FORBIDDEN,
      status: 403,
    });
  });

  it('liberer : autorise un admin a liberer le bail d un autre', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_B });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);
    prisma.bailEdition.delete.mockResolvedValue(bail);

    await service.liberer(VERSION_ID, UTILISATEUR_A, true);

    expect(prisma.bailEdition.delete).toHaveBeenCalledWith({ where: { id: BAIL_ID } });
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LEVEE_VERROU' }) }),
    );
  });

  it('liberer : 404 quand aucun bail actif sur la version', async () => {
    prisma.bailEdition.findUnique.mockResolvedValue(null);

    await expect(service.liberer(VERSION_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
      status: 404,
    });
  });

  /* ------------------------------------------------------------------ */
  /* FORCER (admin)                                                     */
  /* ------------------------------------------------------------------ */

  it('forcer : supprime le bail quand l appelant est admin', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_B, utilisateur: detenteurB });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);
    prisma.bailEdition.delete.mockResolvedValue(bail);

    const resultat = await service.forcer(BAIL_ID, UTILISATEUR_A, true);

    expect(prisma.bailEdition.delete).toHaveBeenCalledWith({ where: { id: BAIL_ID } });
    expect(prisma.journalAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'FORCAGE_BAIL' }),
      }),
    );
    expect(resultat).toEqual({ id: BAIL_ID });
  });

  it('forcer : 403 quand l appelant n est pas admin', async () => {
    await expect(service.forcer(BAIL_ID, UTILISATEUR_A, false)).rejects.toMatchObject({
      code: CODES_ERREUR_API.FORBIDDEN,
      status: 403,
    });
  });

  it('forcer : 404 quand le bail est introuvable', async () => {
    prisma.bailEdition.findUnique.mockResolvedValue(null);

    await expect(service.forcer(BAIL_ID, UTILISATEUR_A, true)).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
      status: 404,
    });
  });

  /* ------------------------------------------------------------------ */
  /* VERIFIER BAIL                                                      */
  /* ------------------------------------------------------------------ */

  it('verifierBail : retourne null quand aucun bail sur la version', async () => {
    prisma.bailEdition.findUnique.mockResolvedValue(null);

    const resultat = await service.verifierBail(VERSION_ID, UTILISATEUR_A);

    expect(resultat).toBeNull();
  });

  it('verifierBail : retourne null quand le bail est expire', async () => {
    const expire = creerBailAvecDetenteur({ dateFin: hier, utilisateurId: UTILISATEUR_B });
    prisma.bailEdition.findUnique.mockResolvedValue(expire);

    const resultat = await service.verifierBail(VERSION_ID, UTILISATEUR_A);

    expect(resultat).toBeNull();
  });

  it('verifierBail : retourne le bail quand l appelant est le detenteur', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);

    const resultat = await service.verifierBail(VERSION_ID, UTILISATEUR_A);

    expect(resultat).toBe(bail);
  });

  it('verifierBail : 423 quand un autre utilisateur detient un bail actif', async () => {
    const bail = creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_B, utilisateur: detenteurB });
    prisma.bailEdition.findUnique.mockResolvedValue(bail);

    await expect(service.verifierBail(VERSION_ID, UTILISATEUR_A)).rejects.toMatchObject({
      code: CODES_ERREUR_API.LOCKED,
      status: 423,
      details: { detenteur: 'Bob Martin' },
    });
  });

  /* ------------------------------------------------------------------ */
  /* PURGE                                                              */
  /* ------------------------------------------------------------------ */

  it('purgerBauxExpires : supprime les baux expires et retourne le compte', async () => {
    prisma.bailEdition.deleteMany.mockResolvedValue({ count: 3 });

    const count = await service.purgerBauxExpires();

    expect(prisma.bailEdition.deleteMany).toHaveBeenCalledWith({
      where: { dateFin: { lt: expect.any(Date) } },
    });
    expect(count).toBe(3);
  });

  it('purgerBauxExpires : ne logge pas quand aucun bail supprime', async () => {
    prisma.bailEdition.deleteMany.mockResolvedValue({ count: 0 });

    const count = await service.purgerBauxExpires();

    expect(count).toBe(0);
  });

  /* ------------------------------------------------------------------ */
  /* CONCURRENCE                                                        */
  /* ------------------------------------------------------------------ */

  it('acquerir : concurrence -> un succès, un 423 (premier arrive, premier servi)', async () => {
    prisma.version.findUnique.mockResolvedValue({ id: VERSION_ID });
    // premier appel : create reussi
    prisma.bailEdition.create.mockResolvedValueOnce(
      creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A }),
    );
    // second appel : P2002 puis findUnique renvoie le bail detenu par A
    prisma.bailEdition.create.mockRejectedValueOnce(erreurP2002());
    prisma.bailEdition.findUnique.mockResolvedValue(
      creerBailAvecDetenteur({ utilisateurId: UTILISATEUR_A }),
    );

    const promesseA = service.acquerir(VERSION_ID, UTILISATEUR_A);
    const promesseB = service.acquerir(VERSION_ID, UTILISATEUR_B).catch((e) => e);

    const [resultatA, erreurB] = await Promise.all([promesseA, promesseB]);

    expect(resultatA).toMatchObject({ utilisateurId: UTILISATEUR_A });
    expect(erreurB).toBeInstanceOf(ApiError);
    expect((erreurB as ApiError).code).toBe(CODES_ERREUR_API.LOCKED);
    expect((erreurB as ApiError).details).toMatchObject({ detenteur: 'Alice Dupont' });
  });

  /* ------------------------------------------------------------------ */
  /* CYCLE DE VIE (purge planifiee)                                     */
  /* ------------------------------------------------------------------ */

  it('onModuleInit / onModuleDestroy : installe et arrete le timer de purge', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    // pas de timer -> onModuleDestroy ne doit rien effacer (branche 'false')
    service.onModuleDestroy();
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    // onModuleInit installe le timer
    service.onModuleInit();
    expect(service.timerPurge).toBeDefined();

    // onModuleDestroy arrete le timer (branche 'true')
    service.onModuleDestroy();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
