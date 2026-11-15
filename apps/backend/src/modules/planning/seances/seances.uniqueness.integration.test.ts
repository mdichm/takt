// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { creerPrismaClient } from '@takt/db';
import { randomUUID } from 'node:crypto';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/takt_test';

const prisma = creerPrismaClient(DATABASE_URL);

function uuid(): string {
  return randomUUID();
}

describe('Seances — contraintes d unicite SQL (TAKT-L06-04)', () => {
  // Le mode replica desactive les contraintes de cle etrangere : on peut inserer
  // des Seance avec des identifiants de reference fictifs. Seules les colonnes
  // NOT NULL de la table "Seance" sont respectees (conformes au schema Prisma
  // courant ; aucune colonne hors schema n'est requise).
  const versionId = uuid();
  const creneauDebutId = uuid();
  const affectationId = uuid();
  const salleIdA = uuid();
  const salleIdB = uuid();
  const enseignantId = uuid();
  const groupeId = uuid();

  async function insererSeance(overrides: {
    salleId?: string;
    enseignantId?: string;
    groupeId?: string;
  } = {}): Promise<string> {
    const id = uuid();
    // SET replica + INSERT + SET origin dans UN seul appel : meme connexion,
    // donc les FK sont effectivement levees pour cet INSERT.
    await prisma.$executeRawUnsafe(
      `SET session_replication_role = replica;
INSERT INTO "Seance" (
        "id", "versionId", "jour", "nbCreneaux", "salleId", "enseignantId",
        "groupeId", "estVerrouillee", "createdAt", "updatedAt",
        "creneauDebutId", "affectationId", "matiereId", "typeEnseignementId"
      ) VALUES (
        '${id}', '${versionId}', 1, 1,
        ${overrides.salleId ? `'${overrides.salleId}'` : 'NULL'},
        ${overrides.enseignantId ? `'${overrides.enseignantId}'` : 'NULL'},
        ${overrides.groupeId ? `'${overrides.groupeId}'` : 'NULL'},
        false, now(), now(),
        '${creneauDebutId}', '${affectationId}', NULL, NULL
      );
SET session_replication_role = origin;`,
    );
    return id;
  }

  beforeAll(async () => {
    // Aucune donnee de reference a preparer : les FK sont levees par insertion
    // (SET session_replication_role = replica dans insererSeance).
  });

  it('HC-RES-01 : deux seances meme version/jour/creneau/salle -> la base rejette (unique violation 23505 ~= P2002)', async () => {
    await insererSeance({ salleId: salleIdA });

    let rejection: unknown;
    try {
      await insererSeance({
        salleId: salleIdA, // meme salle, meme creneau -> doublon UNIQUE
        enseignantId: uuid(), // enseignant different, la salle suffit a bloquer
        groupeId: uuid(),
      });
    } catch (e) {
      rejection = e;
    }
    expect(rejection).toBeDefined();
    expect((rejection as { code?: unknown }).code).toBe('P2010');
    expect((rejection as { message?: string }).message).toContain('unique constraint');
  });

  it('HC-RES-02 : deux seances meme version/jour/creneau/enseignant (salles differentes) -> pas de rejet UNIQUE (detection metier L06-05)', async () => {
    await insererSeance({ salleId: salleIdA });

    // Doit reussir : pas de contrainte UNIQUE sur l enseignant (index composite seulement).
    const id = await insererSeance({
      salleId: salleIdB, // salle differente pour isoler le test enseignant
      enseignantId, // meme enseignant, meme creneau -> autorise au niveau SQL
      groupeId: uuid(),
    });
    const cree = await prisma.seance.findUnique({ where: { id } });
    expect(cree).not.toBeNull();
  });

  it('HC-RES-03 : deux seances meme version/jour/creneau/groupe (salles differentes) -> pas de rejet UNIQUE (detection metier L06-05)', async () => {
    await insererSeance({ salleId: salleIdA });

    // Doit reussir : pas de contrainte UNIQUE sur le groupe (index composite seulement).
    const id = await insererSeance({
      salleId: salleIdB, // salle differente
      enseignantId: uuid(), // enseignant different
      groupeId, // meme groupe, meme creneau -> autorise au niveau SQL
    });
    const cree = await prisma.seance.findUnique({ where: { id } });
    expect(cree).not.toBeNull();
  });

  it('les index de performance existent sur Seance', async () => {
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'Seance' ORDER BY indexname;`,
    );
    const noms = indexes.map((i) => i.indexname);
    expect(noms).toContain('Seance_versionId_jour_creneauDebutId_salleId_key');
    expect(noms).toContain('Seance_versionId_jour_creneauDebutId_enseignantId_idx');
    expect(noms).toContain('Seance_versionId_jour_creneauDebutId_groupeId_idx');
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      `SET session_replication_role = replica;\nTRUNCATE TABLE "Seance" CASCADE;\nSET session_replication_role = origin;`,
    );
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      `SET session_replication_role = replica;
TRUNCATE TABLE "Seance" CASCADE;
SET session_replication_role = origin;`,
    );
    await prisma.$disconnect();
  });
});
