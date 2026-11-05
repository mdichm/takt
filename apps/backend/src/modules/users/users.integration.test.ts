// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Agent } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerPrismaClient } from '@takt/db';
import { PRISMA } from '../common/di/prisma.token';
import { PasswordService } from '../auth/password.service';

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-users-test-jwt-'));
const premiere = generateKeyPairSync('rsa', { modulusLength: 2048 });
writeFileSync(join(DOSSIER_CLES, 'active.private.pem'), premiere.privateKey.export({ type: 'pkcs8', format: 'pem' }));
writeFileSync(join(DOSSIER_CLES, 'active.public.pem'), premiere.publicKey.export({ type: 'spki', format: 'pem' }));

process.env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/takt_test',
  JWT_KEYS_DIRECTORY: DOSSIER_CLES,
  JWT_ACTIVE_KEY_ID: 'active',
  JWT_PREVIOUS_KEY_IDS: '',
  JWT_ISSUER: 'takt-test',
  JWT_AUDIENCE: 'takt-api',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
};

const MOT_DE_PASSE = 'MotDePasseTest123!';

let application: INestApplication;
let prisma: ReturnType<typeof creerPrismaClient>;
let agent: Agent;
let idAdmin: string;
let emailAdmin: string;
let tokenAdmin: string;
const idsACleaner: string[] = [];

const emailUnique = () => `takt-test-${Date.now()}-${Math.random().toString(36).slice(2)}@takt.test`;

async function seConnecter(email: string, motDePasse: string): Promise<string> {
  const reponse = await agent
    .post('/api/v1/auth/login')
    .send({ email, motDePasse })
    .expect(200);
  return reponse.body.data.accessToken;
}

describe('CRUD utilisateurs (TAKT-L03-04)', () => {
  beforeAll(async () => {
    const { AppModule } = await import('../../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PRISMA)
      .useValue(creerPrismaClient(process.env.DATABASE_URL!))
      .compile();
    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1');
    await application.init();

    prisma = creerPrismaClient(process.env.DATABASE_URL!);
    agent = request.agent(application.getHttpServer());

    const passwordService = moduleRef.get(PasswordService);

    // Crée les rôles de référence s'ils n'existent pas
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

    const roleAdmin = await prisma.role.findUnique({ where: { code: 'admin' } });
    const hash = await passwordService.hash(MOT_DE_PASSE);
    emailAdmin = emailUnique();
    const admin = await prisma.utilisateur.create({
      data: {
        email: emailAdmin,
        nom: 'Admin',
        prenom: 'Systeme',
        roleId: roleAdmin!.id,
        motDePasseHash: hash,
        estActif: true,
      },
    });
    idAdmin = admin.id;
    idsACleaner.push(idAdmin);

    tokenAdmin = await seConnecter(emailAdmin, MOT_DE_PASSE);
  });

  afterAll(async () => {
    for (const id of idsACleaner) {
      await prisma.journalAudit.deleteMany({ where: { utilisateurId: id } });
      await prisma.sessionRefresh.deleteMany({ where: { utilisateurId: id } });
      await prisma.utilisateur.deleteMany({ where: { id } });
    }
    await prisma.utilisateur.deleteMany({
      where: { email: { in: ['admin@takt.test', 'inactif@takt.test'] } },
    });
    await application.close();
    await prisma.$disconnect();
  });

  it('POST /users : crée un utilisateur (201)', async () => {
    const email = emailUnique();
    const roleGest = await prisma.role.findUnique({ where: { code: 'gest' } });
    const reponse = await agent
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        email,
        nom: 'Dupont',
        prenom: 'Jean',
        roleId: roleGest!.id,
        motDePasse: MOT_DE_PASSE,
      })
      .expect(201);

    expect(reponse.body.error).toBeNull();
    expect(reponse.body.data.email).toBe(email);
    expect(reponse.body.data.motDePasseHash).toBeUndefined(); // pas de hash exposé
    idsACleaner.push(reponse.body.data.id);
  });

  it('POST /users : email déjà utilisé (400)', async () => {
    const email = emailUnique();
    const roleGest = await prisma.role.findUnique({ where: { code: 'gest' } });
    // Premier utilisateur
    await agent
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ email, nom: 'Dupont', prenom: 'Jean', roleId: roleGest!.id, motDePasse: MOT_DE_PASSE })
      .expect(201);
    // Doublon
    const reponse = await agent
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ email, nom: 'Dupont', prenom: 'Jean', roleId: roleGest!.id, motDePasse: MOT_DE_PASSE })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /users : liste paginée (200)', async () => {
    const reponse = await agent
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(reponse.body.error).toBeNull();
    expect(Array.isArray(reponse.body.data)).toBe(true);
    expect(typeof reponse.body.meta.page).toBe('number');
    expect(typeof reponse.body.meta.pageSize).toBe('number');
    expect(typeof reponse.body.meta.total).toBe('number');
  });

  it('GET /users/:id : détail (200 / 404)', async () => {
    const roleGest = await prisma.role.findUnique({ where: { code: 'gest' } });
    const email = emailUnique();
    const cree = await agent
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ email, nom: 'Test', prenom: 'User', roleId: roleGest!.id, motDePasse: MOT_DE_PASSE })
      .expect(201);
    const id = cree.body.data.id;
    idsACleaner.push(id);

    const reponse = await agent
      .get(`/api/v1/users/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);
    expect(reponse.body.data.email).toBe(email);

    const reponse404 = await agent
      .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /users/:id : modifie un utilisateur (200 / 404)', async () => {
    const roleGest = await prisma.role.findUnique({ where: { code: 'gest' } });
    const email = emailUnique();
    const cree = await agent
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ email, nom: 'Test', prenom: 'User', roleId: roleGest!.id, motDePasse: MOT_DE_PASSE })
      .expect(201);
    const id = cree.body.data.id;
    idsACleaner.push(id);

    const reponse = await agent
      .patch(`/api/v1/users/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nom: 'Modifie' })
      .expect(200);
    expect(reponse.body.data.nom).toBe('Modifie');

    const reponse404 = await agent
      .patch('/api/v1/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nom: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /users/:id : désactive un utilisateur (200 / soft delete)', async () => {
    const roleGest = await prisma.role.findUnique({ where: { code: 'gest' } });
    const email = emailUnique();
    const cree = await agent
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ email, nom: 'ASupprimer', prenom: 'User', roleId: roleGest!.id, motDePasse: MOT_DE_PASSE })
      .expect(201);
    const id = cree.body.data.id;

    const reponse = await agent
      .delete(`/api/v1/users/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.estActif).toBe(false);

    // Vérifie en base que c'est un soft delete
    const enBase = await prisma.utilisateur.findUnique({ where: { id } });
    expect(enBase?.estActif).toBe(false);
  });

  it('DELETE /users/:id : ne peut pas se supprimer soi-même (400)', async () => {
    const reponse = await agent
      .delete(`/api/v1/users/${idAdmin}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Journal d’audit : création et désactivation journalisées (GG-07)', async () => {
    const journal = await prisma.journalAudit.findMany({
      where: { entite: 'Utilisateur', action: { in: ['UTILISATEUR_CREE', 'UTILISATEUR_DESACTIVE'] } },
    });
    expect(journal.length).toBeGreaterThan(0);
    for (const entree of journal) {
      expect(entree.action).toBeDefined();
      expect(entree.horodatage).toBeDefined();
      expect(entree.utilisateurId).toBeDefined();
    }
  });
});
