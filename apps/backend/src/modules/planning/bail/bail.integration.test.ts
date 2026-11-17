// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Agent } from 'supertest';
import { creerPrismaClient, PrismaClient } from '@takt/db';
import { hash as hacherArgon2 } from 'argon2';
import { generateKeyPairSync } from 'node:crypto';
import { sign as signerRsa } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { PRISMA } from '../../common/di/prisma.token';
import { Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { BailModule } from './bail.module';

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-bail-int-jwt-'));
const DATABASE_URL_TEST = process.env.DATABASE_URL ?? 'postgresql://takt:takt@localhost:5432/takt_test';

const { privateKey: clePrivee, publicKey: clePublique } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
writeFileSync(join(DOSSIER_CLES, 'active.private.pem'), clePrivee.export({ type: 'pkcs8', format: 'pem' }));
writeFileSync(join(DOSSIER_CLES, 'active.public.pem'), clePublique.export({ type: 'spki', format: 'pem' }));

interface BailTestCtx {
  application: INestApplication;
  prisma: PrismaClient;
  agent: Agent;
  tokenA: string;
  tokenB: string;
  tokenAdmin: string;
  versionId: string;
}

declare global {
  var __bailCtx: BailTestCtx | undefined;
}

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function creerTokenJwt(sub: string, role: 'admin' | 'gest' | 'rdep' | 'dir'): string {
  const maintenant = Math.floor(Date.now() / 1000);
  const header = enc({ alg: 'RS256', typ: 'JWT' });
  const payload = enc({
    sub,
    role,
    departementIds: [],
    iss: 'takt-test',
    aud: 'takt-api',
    iat: maintenant,
    exp: maintenant + 15 * 60,
  });
  const signature = signerRsa(
    'RSA-SHA256',
    Buffer.from(header + '.' + payload),
    clePrivee,
  );
  return header + '.' + payload + '.' + signature.toString('base64url');
}

describe('Bail d edition (integration, TAKT-L06-07)', () => {
  let application: INestApplication;
  let prisma: PrismaClient;
  let agent: Agent;
  let tokenA: string;
  let tokenB: string;
  let tokenAdmin: string;
  let versionId: string;

  beforeAll(async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: DATABASE_URL_TEST,
      JWT_KEYS_DIRECTORY: DOSSIER_CLES,
      JWT_ACTIVE_KEY_ID: 'active',
      JWT_PREVIOUS_KEY_IDS: '',
      JWT_ISSUER: 'takt-test',
      JWT_AUDIENCE: 'takt-api',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: [] }), CommonModule, BailModule],
      providers: [Reflector],
    })
      .overrideProvider(PRISMA)
      .useValue(creerPrismaClient(DATABASE_URL_TEST))
      .compile();

    application = moduleRef.createNestApplication();
    await application.init();
    agent = request.agent(application.getHttpServer());
    prisma = creerPrismaClient(DATABASE_URL_TEST);

    // Roles (codes uniques) - idempotent
    const roleGest = await prisma.role.upsert({
      where: { code: 'gest' },
      create: { code: 'gest', libelle: 'Gestionnaire' },
      update: {},
    });
    const roleAdmin = await prisma.role.upsert({
      where: { code: 'admin' },
      create: { code: 'admin', libelle: 'Administrateur' },
      update: {},
    });

    const annee = await prisma.anneeUniversitaire.upsert({
      where: { libelle: '2026-2027' },
      create: { libelle: '2026-2027', dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-08-31') },
      update: {},
    });
    const semestre = await prisma.semestre.upsert({
      where: { anneeUniversitaireId_numero: { anneeUniversitaireId: annee.id, numero: 1 } },
      create: { numero: 1, anneeUniversitaireId: annee.id, dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-01-31') },
      update: {},
    });

    const hash = await hacherArgon2('MotDePasseTest123!');
    const utilisateurA = await prisma.utilisateur.upsert({
      where: { email: 'alice.bail@test.takt' },
      create: { email: 'alice.bail@test.takt', motDePasseHash: hash, nom: 'Dupont', prenom: 'Alice', roleId: roleGest.id, estActif: true },
      update: {},
    });
    const utilisateurB = await prisma.utilisateur.upsert({
      where: { email: 'bob.bail@test.takt' },
      create: { email: 'bob.bail@test.takt', motDePasseHash: hash, nom: 'Martin', prenom: 'Bob', roleId: roleGest.id, estActif: true },
      update: {},
    });
    const utilisateurAdmin = await prisma.utilisateur.upsert({
      where: { email: 'admin.bail@test.takt' },
      create: { email: 'admin.bail@test.takt', motDePasseHash: hash, nom: 'Sys', prenom: 'Admin', roleId: roleAdmin.id, estActif: true },
      update: {},
    });

    const version = await prisma.version.create({
      data: { anneeId: annee.id, semestreId: semestre.id, etat: 'initial' },
    });

    versionId = version.id;
    tokenA = creerTokenJwt(utilisateurA.id, 'gest');
    tokenB = creerTokenJwt(utilisateurB.id, 'gest');
    tokenAdmin = creerTokenJwt(utilisateurAdmin.id, 'admin');
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  it('POST /versions/:id/bail : acquisition par Alice -> 200', async () => {
    const reponse = await agent
      .post(`/versions/${versionId}/bail`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const donnees = reponse.body.data ?? reponse.body;
    expect(donnees.detenteur).toBe('Alice Dupont');
    expect(donnees.utilisateurId).toBeDefined();
    expect(donnees.versionId).toBe(versionId);
  });

  it('POST /versions/:id/bail : Bob tente d acquerir alors que Alice detient le bail -> 423 SEANCE_LOCKED', async () => {
    const reponse = await agent
      .post(`/versions/${versionId}/bail`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(423);
    const erreur = reponse.body.error ?? reponse.body;
    expect(erreur.code).toBe('SEANCE_LOCKED');
    expect(erreur.details.detenteur).toBe('Alice Dupont');
  });

  it('POST /versions/:id/bail/renouveler par Alice -> 200, bail prolonge', async () => {
    const avant = await agent
      .post(`/versions/${versionId}/bail/renouveler`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const dateFinAvant = new Date((avant.body.data ?? avant.body).dateFin);

    const apres = await agent
      .post(`/versions/${versionId}/bail/renouveler`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const dateFinApres = new Date((apres.body.data ?? apres.body).dateFin);
    expect(dateFinApres.getTime()).toBeGreaterThanOrEqual(dateFinAvant.getTime());
  });

  it('POST /versions/:id/bail/renouveler par Bob (non detenteur) -> 403', async () => {
    await agent
      .post(`/versions/${versionId}/bail/renouveler`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('DELETE /versions/:id/bail par Alice (detenteur) -> 200, puis Bob peut acquerir', async () => {
    await agent
      .delete(`/versions/${versionId}/bail`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const reponse = await agent
      .post(`/versions/${versionId}/bail`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    const donneesBob = reponse.body.data ?? reponse.body;
    expect(donneesBob.detenteur).toBe('Bob Martin');
    expect(donneesBob.utilisateurId).toBeDefined();
  });

  it('DELETE /bails/:id : forçage par admin -> 200, bail supprime en base', async () => {
    const bailActuel = await prisma.bailEdition.findUnique({ where: { versionId } });
    expect(bailActuel).not.toBeNull();

    await agent
      .delete(`/bails/${bailActuel!.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    const apres = await prisma.bailEdition.findUnique({ where: { versionId } });
    expect(apres).toBeNull();
  });

  it('DELETE /bails/:id par gest (non admin) -> 403', async () => {
    // recrée un bail detenu par Alice
    await agent.post(`/versions/${versionId}/bail`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    const bailActuel = await prisma.bailEdition.findUnique({ where: { versionId } });

    // Bob tente de forcer (gest, non admin)
    await agent
      .delete(`/bails/${bailActuel!.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('acces sans token -> 401', async () => {
    await agent.post(`/versions/${versionId}/bail`).expect(401);
  });
});
