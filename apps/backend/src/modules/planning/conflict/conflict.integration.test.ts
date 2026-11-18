// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Agent } from 'supertest';
import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { hash as hacherArgon2 } from 'argon2';
import { creerPrismaClient } from '@takt/db';
import { VerificateurJwt } from '../../common/guards/jwt-verificateur.interface';
import { PRISMA } from '../../common/di/prisma.token';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../app.module';
import { TokenService } from '../../../modules/auth/token.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

interface Ctx {
  application: INestApplication;
  prisma: ReturnType<typeof creerPrismaClient>;
  agent: Agent;
  tokenRdep: string;
  versionId: string;
  salleId: string;
  groupeId: string;
  enseignantId: string;
  creneauId: string;
  affectationId: string;
}

declare global {
  var __conflictCtx: Ctx | undefined;
}

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-conflict-int-jwt-'));
const paire = generateKeyPairSync('rsa', { modulusLength: 2048 });
writeFileSync(
  join(DOSSIER_CLES, 'active.private.pem'),
  paire.privateKey.export({ type: 'pkcs8', format: 'pem' }),
);
writeFileSync(
  join(DOSSIER_CLES, 'active.public.pem'),
  paire.publicKey.export({ type: 'spki', format: 'pem' }),
);

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

const MDP = 'MotDePasseTest123!';

describe('Conflits (TAKT-L06-05)', () => {
  let application: INestApplication;
  let prisma: ReturnType<typeof creerPrismaClient>;
  let agent: Agent;
  let tokenRdep: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector, DepartmentScopeGuard],
    })
      .overrideProvider(PRISMA)
      .useValue(creerPrismaClient(process.env.DATABASE_URL!))
      .overrideProvider(ConfigService)
      .useValue(new ConfigService())
      .compile();

    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1');
    await application.init();

    const tokenService = moduleRef.get(TokenService);
    const jwtAuthGuard = moduleRef.get(JwtAuthGuard, { strict: false });
    if (jwtAuthGuard) {
      Object.defineProperty(jwtAuthGuard, 'verificateur', {
        value: { verifier: (t: string) => tokenService.verifyAccessToken(t) } as VerificateurJwt,
        writable: true,
        configurable: true,
      });
    }

    prisma = creerPrismaClient(process.env.DATABASE_URL!);
    agent = request.agent(application.getHttpServer());

    await prisma.role.upsert({
      where: { code: 'rdep' },
      update: {},
      create: { code: 'rdep', libelle: 'Rdep' },
    });
    const hash = await hacherArgon2(MDP);
    const rdep = await prisma.utilisateur.create({
      data: {
        email: 'conflict-rdep@test.takt',
        motDePasseHash: hash,
        nom: 'Rdep',
        prenom: 'T',
        role: { connect: { code: 'rdep' } },
      },
    });
    tokenRdep = tokenService.signAccessToken({
      sub: rdep.id,
      role: 'rdep',
      departementIds: [],
    }).token;
    const etablissement = await prisma.etablissement.upsert({
      where: { code: 'ETABC' },
      update: {},
      create: { code: 'ETABC', libelle: 'Etab' },
    });
    const departement = await prisma.departement.upsert({
      where: { code: 'DEPC' },
      update: {},
      create: { code: 'DEPC', libelle: 'Dep', etablissementId: etablissement.id },
    });
    const annee = await prisma.anneeUniversitaire.upsert({
      where: { libelle: '2026-2027' },
      update: {},
      create: { libelle: '2026-2027', dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-06-30') },
    });
    const semestre = await prisma.semestre.upsert({
      where: { anneeUniversitaireId_numero: { anneeUniversitaireId: annee.id, numero: 1 } },
      update: {},
      create: { numero: 1, anneeUniversitaireId: annee.id, dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-01-31') },
    });
    const parcours = await prisma.parcours.upsert({
      where: { code: 'INFO' },
      update: {},
      create: { code: 'INFO', libelle: 'Info', departementId: departement.id },
    });
    const niveau = await prisma.niveau.upsert({
      where: { code: 'L1' },
      update: {},
      create: { code: 'L1', libelle: 'L1', parcoursId: parcours.id },
    });
    const groupe = await prisma.groupe.upsert({
      where: { code: 'L1AC' },
      update: {},
      create: { code: 'L1AC', libelle: 'L1 A C', niveauId: niveau.id },
    });
    const typeSalle = await prisma.typeSalle.upsert({
      where: { code: 'CM' },
      update: {},
      create: { code: 'CM', libelle: 'Cours magistral' },
    });
    const site = await prisma.site.upsert({
      where: { code: 'S1C' },
      update: {},
      create: { code: 'S1C', libelle: 'Site 1' },
    });
    const salle = await prisma.salle.upsert({
      where: { code: 'S101C' },
      update: {},
      create: { code: 'S101C', libelle: 'Salle 101C', typeSalleId: typeSalle.id, capacite: 30, siteId: site.id },
    });
    const typeEnseignement = await prisma.typeEnseignement.upsert({
      where: { code: 'CM' },
      update: {},
      create: { code: 'CM', libelle: 'Cours magistral', couleur: '#FF0000' },
    });
    const grade = await prisma.grade.upsert({
      where: { code: 'G1C' },
      update: {},
      create: { code: 'G1C', libelle: 'Grade 1' },
    });
    const module = await prisma.module.upsert({
      where: { code: 'MODC' },
      update: {},
      create: { code: 'MODC', libelle: 'Module 1', typeEnseignementId: typeEnseignement.id, gradeId: grade.id },
    });
    const matiere = await prisma.matiere.upsert({
      where: { code: 'MATH101C' },
      update: {},
      create: { code: 'MATH101C', libelle: 'Mathematiques', moduleId: module.id },
    });
    const enseignant = await prisma.enseignant.upsert({
      where: { matricule: 'ENS001C' },
      update: {},
      create: { matricule: 'ENS001C', nom: 'Enseignant', prenom: 'Test', email: 'enseignant@test.takt' },
    });
    await prisma.enseignantDepartement.upsert({
      where: { enseignantId_departementId: { enseignantId: enseignant.id, departementId: departement.id } },
      update: {},
      create: { enseignantId: enseignant.id, departementId: departement.id },
    });
    const version = await prisma.version.create({
      data: { anneeId: annee.id, semestreId: semestre.id, etat: 'edition' },
    });
    const creneau = await prisma.creneau.upsert({
      where: { jour_ordre: { jour: 1, ordre: 1 } },
      update: {},
      create: { jour: 1, ordre: 1, heureDebut: new Date('2026-09-01T08:00:00Z'), heureFin: new Date('2026-09-01T09:00:00Z'), dureeMinutes: 60 },
    });
    const affectation = await prisma.affectationPedagogique.create({
      data: {
        versionId: version.id,
        semestreId: semestre.id,
        departementId: departement.id,
        enseignantId: enseignant.id,
        matiereId: matiere.id,
        groupeId: groupe.id,
        typeEnseignementId: typeEnseignement.id,
        volumeHebdo: 2,
        dureeCreneaux: 60,
      },
    });

    globalThis.__conflictCtx! = {
      application,
      prisma,
      agent,
      tokenRdep,
      versionId: version.id,
      salleId: salle.id,
      groupeId: groupe.id,
      enseignantId: enseignant.id,
      creneauId: creneau.id,
      affectationId: affectation.id,
    };
  });

  beforeEach(async () => {
    const ctx = globalThis.__conflictCtx!;
    if (ctx) {
      await ctx.prisma.seance.deleteMany({ where: { affectationId: ctx.affectationId } });
    }
  });

  afterAll(async () => {
    const ctx = globalThis.__conflictCtx!;
    if (ctx) {
      await ctx.prisma.seance.deleteMany({ where: { affectationId: ctx.affectationId } });
      await ctx.prisma.affectationPedagogique.delete({ where: { id: ctx.affectationId } });
      await ctx.prisma.$disconnect();
      await ctx.application.close();
    }
  });

  it('GET /versions/:id/conflits : pas de conflit (200)', async () => {
    const ctx = globalThis.__conflictCtx!;
    const res = await ctx.agent
      .get(`/api/v1/versions/${ctx.versionId}/conflits`)
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .query({ jour: 1, creneauDebutId: ctx.creneauId, nbCreneaux: 1, salleId: ctx.salleId, groupeId: ctx.groupeId })
      .expect(200);
    expect(res.body.error).toBeNull();
    expect(res.body.data.bloquant).toBe(false);
  });

  it('GET /versions/:id/conflits : conflit enseignant (200, bloquant)', async () => {
    const ctx = globalThis.__conflictCtx!;
    await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        groupeId: ctx.groupeId,
        enseignantId: ctx.enseignantId,
        affectationId: ctx.affectationId,
      })
      .expect(201);

    const res = await ctx.agent
      .get(`/api/v1/versions/${ctx.versionId}/conflits`)
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .query({ jour: 1, creneauDebutId: ctx.creneauId, nbCreneaux: 1, salleId: ctx.salleId, enseignantId: ctx.enseignantId })
      .expect(200);
    expect(res.body.data.bloquant).toBe(true);
    expect(res.body.data.conflits.some((c: { type: string }) => c.type === 'ENSEIGNANT')).toBe(true);
  });

  it('POST /seances : conflit enseignant bloquant (409)', async () => {
    const ctx = globalThis.__conflictCtx!;
    await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        groupeId: ctx.groupeId,
        affectationId: ctx.affectationId,
      })
      .expect(201);

    await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        groupeId: ctx.groupeId,
        affectationId: ctx.affectationId,
      })
      .expect(409);
  });
});
