// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tests d'intégration du seed de développement (TAKT-L03-07).
 *
 * Vérifie :
 * 1. Création des 4 comptes démo (admin, gest, rdep, dir)
 * 2. Présence du hash Argon2id sur motDePasseHash
 * 3. Idempotence : deux exécutions consécutives produisent le même état
 * 4. Refus d'exécution en NODE_ENV=production
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { creerPrismaClient } from '../src/index';
import { main } from './seed';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/takt_test';
const prisma = creerPrismaClient(DATABASE_URL);

const EMAILS_ATTENDUS = [
  'admin@takt.internal',
  'gest@takt.internal',
  'rdep@takt.internal',
  'dir@takt.internal',
];

const ROLES_ATTENDUS = ['admin', 'gest', 'rdep', 'dir'];

// Sauvegarde de l'environnement pour restauration entre tests
const envSave: Record<string, string | undefined> = {};

function sauvegarderEnv(keys: string[]) {
  for (const k of keys) {
    envSave[k] = process.env[k];
  }
}

function restaurerEnv(keys: string[]) {
  for (const k of keys) {
    const v = envSave[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

beforeAll(async () => {
  delete process.env.NODE_ENV;
  delete process.env.SEED_DEMO_PASSWORD;
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(() => {
  sauvegarderEnv(['NODE_ENV', 'SEED_DEMO_PASSWORD']);
});

afterEach(() => {
  restaurerEnv(['NODE_ENV', 'SEED_DEMO_PASSWORD']);
});

describe('Seed de développement (TAKT-L03-07)', () => {
  it('crée 4 utilisateurs avec un motDePasseHash présent', async () => {
    await main();

    const utilisateurs = await prisma.utilisateur.findMany({
      where: { email: { in: EMAILS_ATTENDUS } },
      include: { role: true },
    });

    expect(utilisateurs).toHaveLength(4);

    for (const u of utilisateurs) {
      expect(u.motDePasseHash).toBeTruthy();
      expect(u.estActif).toBe(true);
      expect(ROLES_ATTENDUS).toContain(u.role.code);
    }
  });

  it('est idempotent : deux exécutions produisent le même nombre de lignes', async () => {
    await main();

    const countA = await prisma.utilisateur.count({
      where: { email: { in: EMAILS_ATTENDUS } },
    });
    const countRoleA = await prisma.role.count();
    const countDeptA = await prisma.departement.count();
    const countAnneeA = await prisma.anneeUniversitaire.count();
    const countSemestreA = await prisma.semestre.count();

    await main();

    const countB = await prisma.utilisateur.count({
      where: { email: { in: EMAILS_ATTENDUS } },
    });
    const countRoleB = await prisma.role.count();
    const countDeptB = await prisma.departement.count();
    const countAnneeB = await prisma.anneeUniversitaire.count();
    const countSemestreB = await prisma.semestre.count();

    expect(countB).toBe(countA);
    expect(countRoleB).toBe(countRoleA);
    expect(countDeptB).toBe(countDeptA);
    expect(countAnneeB).toBe(countAnneeA);
    expect(countSemestreB).toBe(countSemestreA);
    expect(countA).toBe(4);
    expect(countRoleA).toBe(4);
    expect(countDeptA).toBe(3);
    expect(countAnneeA).toBe(1);
    expect(countSemestreA).toBe(2);
  });

  it('refuse de s\'exécuter si NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';

    await expect(main()).rejects.toThrow(/production/i);
  });

  it('génère un mot de passe si SEED_DEMO_PASSWORD est absente', async () => {
    delete process.env.SEED_DEMO_PASSWORD;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await main();

    // Le mot de passe doit avoir été généré et affiché en console
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('SEED_DEMO_PASSWORD non définie')
    );

    const utilisateurs = await prisma.utilisateur.findMany({
      where: { email: { in: EMAILS_ATTENDUS } },
    });
    expect(utilisateurs).toHaveLength(4);
    for (const u of utilisateurs) {
      expect(u.motDePasseHash).toBeTruthy();
    }

    logSpy.mockRestore();
  });
});
