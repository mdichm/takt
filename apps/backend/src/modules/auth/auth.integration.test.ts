// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Agent } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerPrismaClient } from '@takt/db';
import { PRISMA } from '../common/di/prisma.token';
import { PasswordService } from './password.service';

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-auth-test-jwt-'));
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
let idGestionnaire: string;
let emailGestionnaire: string;
const idsACleaner: string[] = [];

const emailUnique = () => `takt-test-${Date.now()}-${Math.random().toString(36).slice(2)}@takt.test`;

describe('POST /auth/login, /auth/refresh, /auth/logout (TAKT-L03-03)', () => {
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

    const role = await prisma.role.upsert({
      where: { code: 'gest' },
      update: {},
      create: { code: 'gest', libelle: 'Gestionnaire' },
    });

    const hash = await passwordService.hash(MOT_DE_PASSE);
    emailGestionnaire = emailUnique();
    const utilisateur = await prisma.utilisateur.create({
      data: {
        email: emailGestionnaire,
        nom: 'Gestionnaire',
        prenom: 'Test',
        roleId: role.id,
        motDePasseHash: hash,
        estActif: true,
      },
    });
    idGestionnaire = utilisateur.id;
    idsACleaner.push(idGestionnaire);
  });

  afterAll(async () => {
    for (const id of idsACleaner) {
      await prisma.journalAudit.deleteMany({ where: { utilisateurId: id } });
      await prisma.sessionRefresh.deleteMany({ where: { utilisateurId: id } });
      await prisma.utilisateur.deleteMany({ where: { id } });
    }
    await prisma.utilisateur.deleteMany({
      where: {
        email: {
          in: ['gestionnaire@takt.test', 'inactif@takt.test'],
        },
      },
    });
    await prisma?.$disconnect();
    await application?.close();
    rmSync(DOSSIER_CLES, { recursive: true, force: true });
  });

  function extraireRefreshToken(reponse: request.Response): string | undefined {
    const setCookie = reponse.headers['set-cookie'];
    if (!setCookie) {
      return undefined;
    }
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const cookie of cookies) {
      const correspondance = cookie.match(/(?:^|;\s*)refreshToken=([^;]*)/);
      if (correspondance?.[1]) {
        return correspondance[1];
      }
    }
    return undefined;
  }

  async function obtenirRefreshToken(): Promise<string> {
    const reponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: emailGestionnaire, motDePasse: MOT_DE_PASSE })
      .expect(200);
    const token = extraireRefreshToken(reponse);
    expect(token).toBeDefined();
    return token!;
  }

  it('connecte un utilisateur, émet access + refresh dans un cookie HttpOnly (pas de refreshToken dans le corps)', async () => {
    const reponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: emailGestionnaire, motDePasse: MOT_DE_PASSE })
      .expect(200);

    expect(reponse.body.error).toBeNull();
    expect(reponse.body.data.accessToken).toBeTypeOf('string');
    expect(reponse.body.data.refreshToken).toBeUndefined(); // GG-17 : jamais dans le corps

    const cookie = extraireRefreshToken(reponse);
    expect(cookie).toBeDefined();

    const setCookie = reponse.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    const cookieRefresh = cookies.find((c) => c.startsWith('refreshToken='));
    expect(cookieRefresh).toBeDefined();
    expect(cookieRefresh).toContain('HttpOnly');
    expect(cookieRefresh).toContain('Secure');
    expect(cookieRefresh).toContain('SameSite=Strict');
  });

  it('rejette des identifiants invalides (401, sans distinction de cause)', async () => {
    const reponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: 'inconnu@takt.test', motDePasse: MOT_DE_PASSE })
      .expect(401);

    expect(reponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejette un compte inactif (401, sans distinguer de la cause)', async () => {
    const passwordService = application.get(PasswordService);
    const emailInactif = emailUnique();
    const roleGest = await prisma.role.findUnique({ where: { code: 'gest' } });
    const inactif = await prisma.utilisateur.create({
      data: {
        email: emailInactif,
        nom: 'Inactif',
        prenom: 'Test',
        roleId: roleGest!.id,
        motDePasseHash: await passwordService.hash('x'),
        estActif: false,
      },
    });
    idsACleaner.push(inactif.id);

    const reponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: emailInactif, motDePasse: MOT_DE_PASSE })
      .expect(401);

    expect(reponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('applique le rate limiting (429 au-delà de 5 échecs sur 15 min)', async () => {
    const emailRate = `rate-${Date.now()}@takt.test`;
    for (let i = 0; i < 5; i++) {
      await agent
        .post('/api/v1/auth/login')
        .send({ email: emailRate, motDePasse: 'faux' })
        .expect(401);
    }
    const reponse = await agent
      .post('/api/v1/auth/login')
      .send({ email: emailRate, motDePasse: 'faux' })
      .expect(429);

    expect(reponse.body.error.code).toBe('RATE_LIMITED');
  });
  it('rafraîchit les jetons (rotation du refresh) : nouveau accessToken, nouveau cookie, pas de refreshToken dans le corps', async () => {
    const refreshToken = await obtenirRefreshToken();

    const reponse = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(reponse.body.error).toBeNull();
    expect(reponse.body.data.accessToken).toBeTypeOf('string');
    expect(reponse.body.data.refreshToken).toBeUndefined(); // GG-17

    const nouveauCookie = extraireRefreshToken(reponse);
    expect(nouveauCookie).toBeDefined();
    expect(nouveauCookie).not.toBe(refreshToken); // rotation : nouveau jti

    const journal = await prisma.journalAudit.findFirst({
      where: { action: 'REFRESH', utilisateurId: idGestionnaire },
    });
    expect(journal).toBeDefined();
  });

  it('accepte le rafraîchissement par cookie HttpOnly seul (pas de corps requis)', async () => {
    const refreshToken = await obtenirRefreshToken();

    const reponse = await agent
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`)
      .send({})
      .expect(200);

    expect(reponse.body.error).toBeNull();
    expect(reponse.body.data.accessToken).toBeTypeOf('string');
  });

  it('rejette un refresh token déjà consommé (rejeu après rotation)', async () => {
    const refreshToken = await obtenirRefreshToken();

    await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const reponse = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(reponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('révoque la famille au logout et refuse tout refresh ultérieur', async () => {
    const refreshToken = await obtenirRefreshToken();

    await agent
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200);

    const journal = await prisma.journalAudit.findFirst({
      where: { action: 'LOGOUT', utilisateurId: idGestionnaire },
    });
    expect(journal).toBeDefined();

    const reponse = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(reponse.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejette un refresh token invalide (401)', async () => {
    const reponse = await agent
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'jeton.invalide' })
      .expect(401);

    expect(reponse.body.error.code).toBe('UNAUTHORIZED');
  });
});
