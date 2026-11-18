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
import { VerrousModule } from './verrous.module';

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-verrous-int-jwt-'));
const DATABASE_URL_TEST = process.env.DATABASE_URL ?? 'postgresql://takt:takt@localhost:5432/takt_test';

const { privateKey: clePrivee, publicKey: clePublique } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
writeFileSync(join(DOSSIER_CLES, 'active.private.pem'), clePrivee.export({ type: 'pkcs8', format: 'pem' }));
writeFileSync(join(DOSSIER_CLES, 'active.public.pem'), clePublique.export({ type: 'spki', format: 'pem' }));

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

describe('Verrous de seance (integration, TAKT-L06-08)', () => {
  let application: INestApplication;
  let prisma: PrismaClient;
  let agent: Agent;
  let tokenGest: string;
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
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: [] }),
        CommonModule,
        VerrousModule,
      ],
      providers: [Reflector],
    })
      .overrideProvider(PRISMA)
      .useValue(creerPrismaClient(DATABASE_URL_TEST))
      .compile();

    application = moduleRef.createNestApplication();
    await application.init();
    agent = request.agent(application.getHttpServer());
    prisma = creerPrismaClient(DATABASE_URL_TEST);

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

    const hash = await hacherArgon2('MotDePasseTest123!');
    const utilisateurGest = await prisma.utilisateur.upsert({
      where: { email: 'alice.verrous@test.takt' },
      create: {
        email: 'alice.verrous@test.takt',
        motDePasseHash: hash,
        nom: 'Dupont',
        prenom: 'Alice',
        roleId: roleGest.id,
        estActif: true,
      },
      update: {},
    });
    const utilisateurAdmin = await prisma.utilisateur.upsert({
      where: { email: 'admin.verrous@test.takt' },
      create: {
        email: 'admin.verrous@test.takt',
        motDePasseHash: hash,
        nom: 'Sys',
        prenom: 'Admin',
        roleId: roleAdmin.id,
        estActif: true,
      },
      update: {},
    });

    const annee = await prisma.anneeUniversitaire.upsert({
      where: { libelle: '2026-2027' },
      create: {
        libelle: '2026-2027',
        dateDebut: new Date('2026-09-01'),
        dateFin: new Date('2027-08-31'),
      },
      update: {},
    });
    const semestre = await prisma.semestre.upsert({
      where: { anneeUniversitaireId_numero: { anneeUniversitaireId: annee.id, numero: 1 } },
      create: { numero: 1, anneeUniversitaireId: annee.id, dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-01-31') },
      update: {},
    });

    const version = await prisma.version.create({
      data: { anneeId: annee.id, semestreId: semestre.id, etat: 'initial' },
    });
    versionId = version.id;
    tokenGest = creerTokenJwt(utilisateurGest.id, 'gest');
    tokenAdmin = creerTokenJwt(utilisateurAdmin.id, 'admin');
  });
  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  const SEANCE_INEXISTANTE = '00000000-0000-0000-0000-000000000000';

  it('POST /locks sans token -> 401', async () => {
    await agent.post('/locks').expect(401);
  });

  it('POST /locks par un gest atteint le service (seance inexistante) -> 404', async () => {
    const reponse = await agent
      .post('/locks')
      .set('Authorization', `Bearer ${tokenGest}`)
      .send({ versionId, type: 'SALLE', valeur: 'salle-1', seanceId: SEANCE_INEXISTANTE })
      .expect(404);
    const erreur = reponse.body.error ?? reponse.body;
    expect(erreur.code).toBe('NOT_FOUND');
  });

  it('POST /locks par admin sur une seance introuvable -> 404', async () => {
    const reponse = await agent
      .post('/locks')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ versionId, type: 'SALLE', valeur: 'salle-1', seanceId: SEANCE_INEXISTANTE })
      .expect(404);
    const erreur = reponse.body.error ?? reponse.body;
    expect(erreur.code).toBe('NOT_FOUND');
  });

  it('POST /locks sur une version verrouillee (valid_pedag) -> 409', async () => {
    await prisma.version.update({
      where: { id: versionId },
      data: { etat: 'valid_pedag' },
    });
    const reponse = await agent
      .post('/locks')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ versionId, type: 'SALLE', valeur: 'salle-1', seanceId: SEANCE_INEXISTANTE })
      .expect(409);
    const erreur = reponse.body.error ?? reponse.body;
    expect(erreur.code).toBe('WORKFLOW_INVALID_TRANSITION');
  });
});

