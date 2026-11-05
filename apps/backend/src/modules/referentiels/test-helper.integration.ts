// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request, { Agent } from 'supertest';
import { creerPrismaClient } from '@takt/db';
import { PRISMA } from '../common/di/prisma.token';
import { PasswordService } from '../auth/password.service';
import { VERIFICATEUR_JWT, VerificateurJwt } from '../common/guards/jwt-verificateur.interface';

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-referentiels-test-jwt-'));
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
const ADMIN_ID_FOR_TEST = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
process.env.TEST_ADMIN_ID = ADMIN_ID_FOR_TEST;

export interface ContexteTestReferentiels {
  application: INestApplication;
  prisma: ReturnType<typeof creerPrismaClient>;
  agent: Agent;
  tokenAdmin: string;
  idAdmin: string;
  idsACleaner: string[];
}

const emailUnique = () => `takt-test-${Date.now()}-${Math.random().toString(36).slice(2)}@takt.test`;

export async function creerContexteTestReferentiels(): Promise<ContexteTestReferentiels> {
  const { AppModule } = await import('../../app.module');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    providers: [
      { provide: Reflector, useValue: new Reflector() },
      { provide: VERIFICATEUR_JWT, useValue: { verifier: () => ({ sub: ADMIN_ID_FOR_TEST, role: 'admin' as const, departementIds: [], typ: 'access', jti: 'mock-jti', iat: 0, nbf: 0, exp: 9999999999, iss: 'takt-test', aud: 'takt-api' }) } },
    ],
  })
    .overrideProvider(PRISMA)
    .useValue(creerPrismaClient(process.env.DATABASE_URL!))
    .compile();

  const verificateur = moduleRef.get(VERIFICATEUR_JWT) as VerificateurJwt;
  verificateur.verifier = () => ({ sub: ADMIN_ID_FOR_TEST, role: 'admin' as const, departementIds: [], typ: 'access', jti: 'mock-jti', iat: 0, nbf: 0, exp: 9999999999, iss: 'takt-test', aud: 'takt-api' });

  const application = moduleRef.createNestApplication();
  application.setGlobalPrefix('api/v1');
  await application.init();

  const prisma = creerPrismaClient(process.env.DATABASE_URL!);
  const agent = request.agent(application.getHttpServer());

  const passwordService = moduleRef.get(PasswordService);

  await prisma.role.upsert({ where: { code: 'admin' }, update: {}, create: { code: 'admin', libelle: 'Administrateur' } });
  await prisma.role.upsert({ where: { code: 'gest' }, update: {}, create: { code: 'gest', libelle: 'Gestionnaire' } });

  const roleAdmin = await prisma.role.findUnique({ where: { code: 'admin' } });
  const hash = await passwordService.hash(MOT_DE_PASSE);
  const emailAdmin = emailUnique();
  const admin = await prisma.utilisateur.create({
    data: {
      id: ADMIN_ID_FOR_TEST,
      email: emailAdmin,
      nom: 'Admin',
      prenom: 'Systeme',
      roleId: roleAdmin!.id,
      motDePasseHash: hash,
      estActif: true,
    },
  });

  const loginResp = await agent.post('/api/v1/auth/login').send({ email: emailAdmin, motDePasse: MOT_DE_PASSE });
  const tokenAdmin = loginResp.status === 200 ? loginResp.body.data.accessToken : '';

  return { application, prisma, agent, tokenAdmin, idAdmin: admin.id, idsACleaner: [admin.id] };
}

export async function nettoyerContexteTest(ctx: ContexteTestReferentiels) {
  for (const id of ctx.idsACleaner) {
    await ctx.prisma.journalAudit.deleteMany({ where: { utilisateurId: id } });
    await ctx.prisma.sessionRefresh.deleteMany({ where: { utilisateurId: id } });
    await ctx.prisma.utilisateur.deleteMany({ where: { id } });
  }
  await ctx.prisma.$disconnect();
  await ctx.application.close();
}