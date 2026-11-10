// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerPrismaClient } from '@takt/db';
import { PRISMA } from '../common/di/prisma.token';
import { UsersService } from './users.service';

process.env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/takt_test',
};

let application: INestApplication;
let prisma: ReturnType<typeof creerPrismaClient>;
let service: UsersService;
const idsACleaner: string[] = [];

const emailUnique = () =>
  `takt-rbac-svc-${Date.now()}-${Math.random().toString(36).slice(2)}@takt.test`;

async function creerUtilisateur(
  email: string,
  roleCode: string,
  departementId: string | null,
): Promise<string> {
  const role = await prisma.role.findUnique({ where: { code: roleCode } });
  if (!role) {
    throw new Error(`Rôle ${roleCode} introuvable`);
  }
  const utilisateur = await prisma.utilisateur.create({
    data: {
      email,
      nom: 'Test',
      prenom: 'User',
      roleId: role.id,
      departementId,
      motDePasseHash: 'hash-fictif',
      estActif: true,
    },
  });
  idsACleaner.push(utilisateur.id);
  return utilisateur.id;
}

describe('RBAC service - portée par département (TAKT-L03-05)', () => {
  beforeAll(async () => {
    const { AppModule } = await import('../../app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA)
      .useValue(creerPrismaClient(process.env.DATABASE_URL!))
      .compile();
    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1');
    await application.init();

    prisma = creerPrismaClient(process.env.DATABASE_URL!);
    service = moduleRef.get(UsersService);

    await prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: { code: 'admin', libelle: 'Administrateur' },
    });
    await prisma.role.upsert({
      where: { code: 'gest' },
      update: {},
      create: { code: 'gest', libelle: 'Gestionnaire' },
    });
    await prisma.role.upsert({
      where: { code: 'rdep' },
      update: {},
      create: { code: 'rdep', libelle: 'Responsable département' },
    });
    await prisma.role.upsert({
      where: { code: 'dir' },
      update: {},
      create: { code: 'dir', libelle: 'Directeur' },
    });

    const etablissement = await prisma.etablissement.upsert({
      where: { code: 'ETAB-TEST' },
      update: {},
      create: { code: 'ETAB-TEST', libelle: 'Établissement test' },
    });
    await prisma.departement.upsert({
      where: { code: 'DEPT-A' },
      update: {},
      create: { code: 'DEPT-A', libelle: 'Département A', etablissementId: etablissement.id },
    });
    await prisma.departement.upsert({
      where: { code: 'DEPT-B' },
      update: {},
      create: { code: 'DEPT-B', libelle: 'Département B', etablissementId: etablissement.id },
    });
  });

  afterAll(async () => {
    for (const id of idsACleaner) {
      await prisma.utilisateur.delete({ where: { id } }).catch(() => {});
    }
    await application.close();
    await prisma.$disconnect();
  });

  it('listUsers admin voit tous les utilisateurs', async () => {
    const deptA = await prisma.departement.findUnique({ where: { code: 'DEPT-A' } });
    const deptB = await prisma.departement.findUnique({ where: { code: 'DEPT-B' } });

    const id1 = await creerUtilisateur(emailUnique(), 'admin', null);
    const id2 = await creerUtilisateur(emailUnique(), 'gest', deptA!.id);
    const id3 = await creerUtilisateur(emailUnique(), 'rdep', deptB!.id);

    // Chaque utilisateur créé est accessible individuellement
    await expect(service.getUser(id1)).resolves.toBeDefined();
    await expect(service.getUser(id2)).resolves.toBeDefined();
    await expect(service.getUser(id3)).resolves.toBeDefined();

    // L'admin voit tous les utilisateurs (total >= 3 créés)
    const resultat = await service.listUsers(
      { page: 1, pageSize: 100 },
      { utilisateurId: 'admin-id', departementIds: [] },
    );
    expect(resultat.meta.total).toBeGreaterThanOrEqual(3);
  });

  it('listUsers rdep ne voit que son département', async () => {
    const deptA = await prisma.departement.findUnique({ where: { code: 'DEPT-A' } });
    const deptB = await prisma.departement.findUnique({ where: { code: 'DEPT-B' } });

    const idRdepA = await creerUtilisateur(emailUnique(), 'rdep', deptA!.id);
    const idDeptA = await creerUtilisateur(emailUnique(), 'gest', deptA!.id);
    const idDeptB = await creerUtilisateur(emailUnique(), 'gest', deptB!.id);

    // Chaque utilisateur créé est accessible individuellement
    await expect(service.getUser(idRdepA)).resolves.toBeDefined();
    await expect(service.getUser(idDeptA)).resolves.toBeDefined();
    await expect(service.getUser(idDeptB)).resolves.toBeDefined();

    // Le rdep ne voit que son département
    const resultat = await service.listUsers(
      { page: 1, pageSize: 100 },
      { utilisateurId: idRdepA, departementIds: [deptA!.id] },
    );

    const ids = resultat.data.map((u: { id: string }) => u.id);
    expect(ids).toContain(idRdepA);
    expect(ids).toContain(idDeptA);
    expect(ids).not.toContain(idDeptB);
  });

  it("getUser admin peut consulter n'importe qui", async () => {
    const deptA = await prisma.departement.findUnique({ where: { code: 'DEPT-A' } });
    const idUtilisateur = await creerUtilisateur(emailUnique(), 'gest', deptA!.id);

    const utilisateur = await service.getUser(idUtilisateur, {
      utilisateurIdDemandeur: 'admin-id',
      roleDemandeur: 'admin',
      departementIds: [],
    });
    expect(utilisateur.id).toBe(idUtilisateur);
  });

  it("getUser rdep ne peut pas consulter un utilisateur d'un autre département → 403", async () => {
    const deptA = await prisma.departement.findUnique({ where: { code: 'DEPT-A' } });
    const deptB = await prisma.departement.findUnique({ where: { code: 'DEPT-B' } });

    const idRdepA = await creerUtilisateur(emailUnique(), 'rdep', deptA!.id);
    const idDeptB = await creerUtilisateur(emailUnique(), 'gest', deptB!.id);

    await expect(
      service.getUser(idDeptB, {
        utilisateurIdDemandeur: idRdepA,
        roleDemandeur: 'rdep',
        departementIds: [deptA!.id],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('getUser auto-consultation toujours autorisée', async () => {
    const deptA = await prisma.departement.findUnique({ where: { code: 'DEPT-A' } });
    const idUtilisateur = await creerUtilisateur(emailUnique(), 'rdep', deptA!.id);

    const utilisateur = await service.getUser(idUtilisateur, {
      utilisateurIdDemandeur: idUtilisateur,
      roleDemandeur: 'rdep',
      departementIds: [deptA!.id],
    });
    expect(utilisateur.id).toBe(idUtilisateur);
  });

  it("updateUser rdep ne peut pas modifier un utilisateur d'un autre département → 403", async () => {
    const deptA = await prisma.departement.findUnique({ where: { code: 'DEPT-A' } });
    const deptB = await prisma.departement.findUnique({ where: { code: 'DEPT-B' } });

    const idRdepA = await creerUtilisateur(emailUnique(), 'rdep', deptA!.id);
    const idDeptB = await creerUtilisateur(emailUnique(), 'gest', deptB!.id);

    await expect(
      service.updateUser(
        idDeptB,
        { nom: 'Modifie', utilisateurIdModifiePar: idRdepA },
        {
          utilisateurIdDemandeur: idRdepA,
          roleDemandeur: 'rdep',
          departementIds: [deptA!.id],
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('updateUser rdep peut modifier un utilisateur de son département → 200', async () => {
    const deptA = await prisma.departement.findUnique({ where: { code: 'DEPT-A' } });

    const idRdepA = await creerUtilisateur(emailUnique(), 'rdep', deptA!.id);
    const idDeptA = await creerUtilisateur(emailUnique(), 'gest', deptA!.id);

    const resultat = await service.updateUser(
      idDeptA,
      { nom: 'Modifie OK', utilisateurIdModifiePar: idRdepA },
      {
        utilisateurIdDemandeur: idRdepA,
        roleDemandeur: 'rdep',
        departementIds: [deptA!.id],
      },
    );
    expect(resultat.nom).toBe('Modifie OK');
  });
});
