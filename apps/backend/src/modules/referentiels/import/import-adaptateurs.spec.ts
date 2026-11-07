// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, test } from 'vitest';
import {
  adaptateurPour,
  chargerCaches,
  type ContexteImport,
  type CachesFk,
  type VusImport,
  type ResultatCreation,
  type PrismaTx,
} from './import-adaptateurs';

// ---------------------------------------------------------------------------
// Faux client Prisma (pas de base de données pour ces tests unitaires)
// ---------------------------------------------------------------------------

interface CreateArgs {
  readonly data: Record<string, unknown>;
}

interface FauxCreate {
  readonly create: (args: unknown) => Promise<{ readonly id: string }>;
}

interface FauxTx {
  readonly site: FauxCreate;
  readonly typeSalle: FauxCreate;
  readonly equipement: FauxCreate;
  readonly salle: FauxCreate;
  readonly groupe: FauxCreate;
  readonly enseignant: FauxCreate;
  readonly findMany: () => Promise<unknown[]>;
}

function creerFauxTx(): FauxTx {
  const creer = (table: string, donnees: Record<string, unknown>) => ({
    id: `${table}-${String(donnees.code ?? donnees.matricule ?? 'x')}`,
  });
  return {
    site: { create: async (_args: unknown) => creer('site', (_args as CreateArgs).data) },
    typeSalle: { create: async (_args: unknown) => creer('typeSalle', (_args as CreateArgs).data) },
    equipement: { create: async (_args: unknown) => creer('equipement', (_args as CreateArgs).data) },
    salle: { create: async (_args: unknown) => creer('salle', (_args as CreateArgs).data) },
    groupe: { create: async (_args: unknown) => creer('groupe', (_args as CreateArgs).data) },
    enseignant: { create: async (_args: unknown) => creer('enseignant', (_args as CreateArgs).data) },
    findMany: async () => [],
  } as FauxTx;
}

function creerContexte(
  caches: Partial<CachesFk> = {},
  vus: Partial<VusImport> = {},
): ContexteImport {
  const tx = creerFauxTx() as unknown as PrismaTx;
  return {
    tx,
    caches: {
      sites: new Map(caches.sites?.entries() ?? []),
      typesSalle: new Map(caches.typesSalle?.entries() ?? []),
      niveaux: new Map(caches.niveaux?.entries() ?? []),
      grades: new Map(caches.grades?.entries() ?? []),
    },
    vus: {
      codes: new Set(vus.codes),
      matricules: new Set(vus.matricules),
      emails: new Set(vus.emails),
    },
  };
}

const LIGNE = (ligne = 2, donnees: Record<string, string> = {}) => ({
  __ligne: String(ligne),
  ...donnees,
});

describe('import-adaptateurs — contrats (L04-07)', () => {
  test.each([
    'site',
    'type-salle',
    'equipement',
    'salle',
    'groupe',
    'enseignant',
  ] as const)('adaptateur disponible pour %s', (type) => {
    const a = adaptateurPour(type);
    expect(a.type).toBe(type);
    expect(a.entetesAttendus.length).toBeGreaterThan(0);
  });

  test('chargerCaches indexe par code', async () => {
    const tx = {
      site: { findMany: async () => [{ code: 'S1', id: 'id1' }] },
      typeSalle: { findMany: async () => [{ code: 'AMPHI', id: 'id2' }] },
      niveau: { findMany: async () => [{ code: 'L1', id: 'id3' }] },
      grade: { findMany: async () => [{ code: 'PR', id: 'id4' }] },
    } as unknown as PrismaTx;
    const caches = await chargerCaches(tx);
    expect(caches.sites.get('S1')).toBe('id1');
    expect(caches.typesSalle.get('AMPHI')).toBe('id2');
    expect(caches.niveaux.get('L1')).toBe('id3');
    expect(caches.grades.get('PR')).toBe('id4');
  });
});

describe('import-adaptateurs — site / type-salle / equipement (L04-07)', () => {
  test('site : crée et met à jour le cache', async () => {
    const a = adaptateurPour('site');
    const ctx = creerContexte();
    const resultat: ResultatCreation = await a.creer(
      LIGNE(2, { code: 'S1', libelle: 'Site 1' }),
      ctx,
    );
    if ('erreur' in resultat) {
      throw new Error(JSON.stringify(resultat.erreur));
    }
    expect(resultat.id).toBe('site-S1');
    expect(ctx.caches.sites.get('S1')).toBe('site-S1');
    expect(ctx.vus.codes.has('S1')).toBe(true);
  });

  test('site : ligne invalide → erreur de ligne', async () => {
    const a = adaptateurPour('site');
    const ctx = creerContexte();
    const resultat = await a.creer(LIGNE(3, { code: '', libelle: 'X' }), ctx);
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) {
      expect(resultat.erreur.ligne).toBe(3);
      expect(resultat.erreur.champ).toBe('code');
    }
  });

  test('site : doublon interne détecté', async () => {
    const a = adaptateurPour('site');
    const ctx = creerContexte();
    await a.creer(LIGNE(2, { code: 'S1', libelle: 'A' }), ctx);
    const resultat = await a.creer(LIGNE(5, { code: 'S1', libelle: 'B' }), ctx);
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) {
      expect(resultat.erreur.ligne).toBe(5);
      expect(resultat.erreur.motif).toContain('déjà utilisé');
    }
  });

  test('site : code déjà en base détecté', async () => {
    const a = adaptateurPour('site');
    const ctx = creerContexte({ sites: new Map([['S1', 'id-existant']]) });
    const resultat = await a.creer(LIGNE(2, { code: 'S1', libelle: 'A' }), ctx);
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) {
      expect(resultat.erreur.motif).toContain('déjà en base');
    }
  });

  test('type-salle : crée', async () => {
    const a = adaptateurPour('type-salle');
    const ctx = creerContexte();
    const resultat = await a.creer(
      LIGNE(2, { code: 'AMPHI', libelle: 'Amphithéâtre' }),
      ctx,
    );
    expect('id' in resultat).toBe(true);
  });

  test('equipement : crée', async () => {
    const a = adaptateurPour('equipement');
    const ctx = creerContexte();
    const resultat = await a.creer(
      LIGNE(2, { code: 'VID', libelle: 'Vidéo-projecteur' }),
      ctx,
    );
    expect('id' in resultat).toBe(true);
  });
});

describe('import-adaptateurs — salle (FK) (L04-07)', () => {
  test('crée une salle avec FK résolues', async () => {
    const a = adaptateurPour('salle');
    const ctx = creerContexte({
      sites: new Map([['S1', 'id-site']]),
      typesSalle: new Map([['AMPHI', 'id-type']]),
    });
    const resultat = await a.creer(
      LIGNE(2, {
        code: 'A101',
        libelle: 'Amphi 101',
        typeSalle: 'AMPHI',
        capacite: '200',
        site: 'S1',
      }),
      ctx,
    );
    expect('id' in resultat).toBe(true);
    if ('id' in resultat) expect(resultat.id).toBe('salle-A101');
  });

  test('site inconnu → erreur de ligne', async () => {
    const a = adaptateurPour('salle');
    const ctx = creerContexte({
      sites: new Map([['S1', 'id-site']]),
      typesSalle: new Map([['AMPHI', 'id-type']]),
    });
    const resultat = await a.creer(
      LIGNE(3, {
        code: 'A102',
        libelle: 'Salle',
        typeSalle: 'AMPHI',
        capacite: '50',
        site: 'INCONNU',
      }),
      ctx,
    );
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) {
      expect(resultat.erreur.champ).toBe('site');
      expect(resultat.erreur.ligne).toBe(3);
    }
  });

  test('type de salle inconnu → erreur de ligne', async () => {
    const a = adaptateurPour('salle');
    const ctx = creerContexte({
      sites: new Map([['S1', 'id-site']]),
      typesSalle: new Map([['AMPHI', 'id-type']]),
    });
    const resultat = await a.creer(
      LIGNE(4, {
        code: 'A103',
        libelle: 'Salle',
        typeSalle: 'INCONNU',
        capacite: '50',
        site: 'S1',
      }),
      ctx,
    );
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) {
      expect(resultat.erreur.champ).toBe('typeSalle');
    }
  });

  test('capacité invalide → erreur de ligne', async () => {
    const a = adaptateurPour('salle');
    const ctx = creerContexte({
      sites: new Map([['S1', 'id-site']]),
      typesSalle: new Map([['AMPHI', 'id-type']]),
    });
    const resultat = await a.creer(
      LIGNE(5, {
        code: 'A104',
        libelle: 'Salle',
        typeSalle: 'AMPHI',
        capacite: 'abc',
        site: 'S1',
      }),
      ctx,
    );
    expect('erreur' in resultat).toBe(true);
  });
});

describe('import-adaptateurs — groupe / enseignant (L04-07)', () => {
  test('groupe : crée avec niveau résolu', async () => {
    const a = adaptateurPour('groupe');
    const ctx = creerContexte({ niveaux: new Map([['L1', 'id-niveau']]) });
    const resultat = await a.creer(
      LIGNE(2, { code: 'G1', libelle: 'Groupe 1', niveau: 'L1' }),
      ctx,
    );
    expect('id' in resultat).toBe(true);
  });

  test('groupe : niveau inconnu → erreur', async () => {
    const a = adaptateurPour('groupe');
    const ctx = creerContexte({ niveaux: new Map([['L1', 'id-niveau']]) });
    const resultat = await a.creer(
      LIGNE(3, { code: 'G2', libelle: 'Groupe 2', niveau: 'INCONNU' }),
      ctx,
    );
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) expect(resultat.erreur.champ).toBe('niveau');
  });

  test('enseignant : crée avec matricule, email et grade', async () => {
    const a = adaptateurPour('enseignant');
    const ctx = creerContexte({ grades: new Map([['PR', 'id-grade']]) });
    const resultat = await a.creer(
      LIGNE(2, {
        matricule: 'E001',
        nom: 'Dupont',
        prenom: 'Jean',
        email: 'jean.dupont@example.com',
        grade: 'PR',
        actif: 'true',
      }),
      ctx,
    );
    expect('id' in resultat).toBe(true);
    if ('id' in resultat) expect(resultat.id).toBe('enseignant-E001');
    expect(ctx.vus.emails.has('jean.dupont@example.com')).toBe(true);
  });

  test('enseignant : email invalide → erreur', async () => {
    const a = adaptateurPour('enseignant');
    const ctx = creerContexte();
    const resultat = await a.creer(
      LIGNE(3, {
        matricule: 'E002',
        nom: 'Durand',
        prenom: 'Marie',
        email: 'pas-un-email',
      }),
      ctx,
    );
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) expect(resultat.erreur.champ).toBe('email');
  });

  test('enseignant : grade inconnu → erreur', async () => {
    const a = adaptateurPour('enseignant');
    const ctx = creerContexte({ grades: new Map([['PR', 'id-grade']]) });
    const resultat = await a.creer(
      LIGNE(4, {
        matricule: 'E003',
        nom: 'Martin',
        prenom: 'Luc',
        email: 'luc@example.com',
        grade: 'INCONNU',
      }),
      ctx,
    );
    expect('erreur' in resultat).toBe(true);
    if ('erreur' in resultat) expect(resultat.erreur.champ).toBe('grade');
  });
});

