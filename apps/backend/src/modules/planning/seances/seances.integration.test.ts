// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
import { AppModule } from '../../../app.module';
import { TokenService } from '../../../modules/auth/token.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

interface SeancesTestCtx {
  application: INestApplication;
  prisma: ReturnType<typeof creerPrismaClient>;
  agent: Agent;
  tokenAdmin: string;
  tokenRdep: string;
  departementId: string;
  semestreId: string;
  versionId: string;
  matiereId: string;
  typeEnseignementId: string;
  enseignantId: string;
  groupeId: string;
  salleId: string;
  creneauId: string;
  affectationId: string;
}

declare global {
  var __seancesCtx: SeancesTestCtx | undefined;
}

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-seances-int-jwt-'));
const premiere = generateKeyPairSync('rsa', { modulusLength: 2048 });
writeFileSync(
  join(DOSSIER_CLES, 'active.private.pem'),
  premiere.privateKey.export({ type: 'pkcs8', format: 'pem' }),
);
writeFileSync(
  join(DOSSIER_CLES, 'active.public.pem'),
  premiere.publicKey.export({ type: 'spki', format: 'pem' }),
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

const MOT_DE_PASSE = 'MotDePasseTest123!';

describe('Seances (TAKT-L06-03)', () => {
  let application: INestApplication;
  let prisma: ReturnType<typeof creerPrismaClient>;
  let agent: Agent;
  let tokenAdmin: string;
  let tokenRdep: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector, DepartmentScopeGuard],
    })
      .overrideProvider('PRISMA')
      .useValue(creerPrismaClient(process.env.DATABASE_URL!))
      .compile();

    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1');
    await application.init();

    const tokenService = moduleRef.get(TokenService);
    const jwtAuthGuard = moduleRef.get(JwtAuthGuard, { strict: false });
    if (jwtAuthGuard) {
      Object.defineProperty(jwtAuthGuard, 'verificateur', {
        value: {
          verifier: (token: string) => tokenService.verifyAccessToken(token),
        } as VerificateurJwt,
        writable: true,
        configurable: true,
      });
    }

    prisma = creerPrismaClient(process.env.DATABASE_URL!);
    agent = request.agent(application.getHttpServer());

    await prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: { code: 'admin', libelle: 'Administrateur' },
    });
    await prisma.role.upsert({
      where: { code: 'rdep' },
      update: {},
      create: { code: 'rdep', libelle: 'Responsable departement' },
    });

    const emailUnique = () =>
      'takt-test-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '@takt.test';
    const hash = await hacherArgon2(MOT_DE_PASSE);

    const admin = await prisma.utilisateur.create({
      data: {
        email: emailUnique(),
        motDePasseHash: hash,
        nom: 'Admin',
        prenom: 'Test',
        role: { connect: { code: 'admin' } },
      },
    });
    const rdep = await prisma.utilisateur.create({
      data: {
        email: emailUnique(),
        motDePasseHash: hash,
        nom: 'Rdep',
        prenom: 'Test',
        role: { connect: { code: 'rdep' } },
      },
    });

    tokenAdmin = tokenService.signAccessToken({
      sub: admin.id,
      role: 'admin',
      departementIds: [],
    }).token;
    tokenRdep = tokenService.signAccessToken({
      sub: rdep.id,
      role: 'rdep',
      departementIds: [],
    }).token;
    const etablissement = await prisma.etablissement.create({
      data: { code: 'ETAB01', libelle: 'Etablissement test' },
    });
    const departement = await prisma.departement.create({
      data: { code: 'DEP01', libelle: 'Departement test', etablissementId: etablissement.id },
    });
    const anneeUniversitaire = await prisma.anneeUniversitaire.create({
      data: { libelle: '2026-2027', dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-06-30') },
    });
    const semestre = await prisma.semestre.create({
      data: { numero: 1, anneeUniversitaireId: anneeUniversitaire.id, dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-01-31') },
    });
    const parcours = await prisma.parcours.create({
      data: { code: 'INFO', libelle: 'Informatique', departementId: departement.id },
    });
    const niveau = await prisma.niveau.create({
      data: { code: 'L1', libelle: 'Licence 1', parcoursId: parcours.id },
    });
    const groupe = await prisma.groupe.create({
      data: { code: 'L1A', libelle: 'L1 A', niveauId: niveau.id },
    });
    const typeSalle = await prisma.typeSalle.create({
      data: { code: 'CM', libelle: 'Cours magistral' },
    });
    const site = await prisma.site.create({
      data: { code: 'SITE1', libelle: 'Site 1' },
    });
    const salle = await prisma.salle.create({
      data: { code: 'S101', libelle: 'Salle 101', typeSalleId: typeSalle.id, capacite: 30, siteId: site.id },
    });
    const typeEnseignement = await prisma.typeEnseignement.create({
      data: { code: 'CM', libelle: 'Cours magistral', couleur: '#FF0000' },
    });
    const grade = await prisma.grade.create({
      data: { code: 'G1', libelle: 'Grade 1' },
    });
    const module = await prisma.module.create({
      data: { code: 'MOD1', libelle: 'Module 1', typeEnseignementId: typeEnseignement.id, gradeId: grade.id },
    });
    const matiere = await prisma.matiere.create({
      data: { code: 'MATH101', libelle: 'Mathematiques', moduleId: module.id },
    });
    const enseignant = await prisma.enseignant.create({
      data: { matricule: 'ENS001', nom: 'Enseignant', prenom: 'Test', email: 'enseignant@test.takt' },
    });
    await prisma.enseignantDepartement.create({
      data: { enseignantId: enseignant.id, departementId: departement.id },
    });
    const version = await prisma.version.create({
      data: { anneeId: anneeUniversitaire.id, semestreId: semestre.id, etat: 'edition' },
    });
    const creneau = await prisma.creneau.create({
      data: { jour: 1, ordre: 1, heureDebut: new Date('2026-09-01T08:00:00Z'), heureFin: new Date('2026-09-01T09:00:00Z'), dureeMinutes: 60 },
    });
    const affectation = await prisma.affectationPedagogique.create({
      data: { versionId: version.id, semestreId: semestre.id, departementId: departement.id, enseignantId: enseignant.id, matiereId: matiere.id, groupeId: groupe.id, typeEnseignementId: typeEnseignement.id, volumeHebdo: 2, dureeCreneaux: 60 },
    });

    // any-justify: contexte de test global partagé entre hooks et tests
    globalThis.__seancesCtx! = {
      application, prisma, agent, tokenAdmin, tokenRdep,
      departementId: departement.id, semestreId: semestre.id, versionId: version.id,
      matiereId: matiere.id, typeEnseignementId: typeEnseignement.id, enseignantId: enseignant.id,
      groupeId: groupe.id, salleId: salle.id, creneauId: creneau.id, affectationId: affectation.id,
    };
  });
  afterAll(async () => {
    // any-justify: contexte de test global partagé entre hooks et tests
    const ctx = globalThis.__seancesCtx!;
    if (ctx) {
      await ctx.prisma.seance.deleteMany({ where: { affectationId: ctx.affectationId } });
      await ctx.prisma.affectationPedagogique.delete({ where: { id: ctx.affectationId } });
      await ctx.prisma.$disconnect();
      await ctx.application.close();
    }
  });

  it('POST /seances : creation + audit (201)', async () => {
    const ctx = globalThis.__seancesCtx!;
    // any-justify: contexte de test global partagé entre hooks et tests
    const cree = await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        affectationId: ctx.affectationId,
      })
      .expect(201);

    expect(cree.body.data.id).toBeDefined();
    expect(cree.body.data.creneauDebut.id).toBe(ctx.creneauId);
    expect(cree.body.data.salle.id).toBe(ctx.salleId);

    const audit = await ctx.prisma.journalAudit.findFirst({
      where: { entite: 'Seance', entiteId: cree.body.data.id, action: 'CREATION' },
    });
    expect(audit).not.toBeNull();
  });

  it('POST /seances : version publiee refuse (409)', async () => {
    const ctx = globalThis.__seancesCtx!;
    // any-justify: contexte de test global partagé entre hooks et tests
    await ctx.prisma.version.update({
      where: { id: ctx.versionId },
      data: { etat: 'valid_dir' },
    });

    await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 2,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        affectationId: ctx.affectationId,
      })
      .expect(409);

    await ctx.prisma.version.update({
      where: { id: ctx.versionId },
      data: { etat: 'edition' },
    });
  });

  it('POST /seances : affectation hors version refuse (400)', async () => {
    const ctx = globalThis.__seancesCtx!;
    // any-justify: contexte de test global partagé entre hooks et tests
    const autreVersion = await ctx.prisma.version.create({
      data: { anneeId: '77777777-7777-7777-7777-777777777777', semestreId: ctx.semestreId, etat: 'edition' },
    });
    const autreAffectation = await ctx.prisma.affectationPedagogique.create({
      data: { versionId: autreVersion.id, semestreId: ctx.semestreId, departementId: ctx.departementId, enseignantId: ctx.enseignantId, matiereId: ctx.matiereId, groupeId: ctx.groupeId, typeEnseignementId: ctx.typeEnseignementId, volumeHebdo: 2, dureeCreneaux: 60 },
    });

    await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 3,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        affectationId: autreAffectation.id,
      })
      .expect(400);

    await ctx.prisma.seance.deleteMany({ where: { affectationId: autreAffectation.id } });
    await ctx.prisma.affectationPedagogique.delete({ where: { id: autreAffectation.id } });
    await ctx.prisma.version.delete({ where: { id: autreVersion.id } });
  });
  it('GET /seances/:id : detail (200)', async () => {
    const ctx = globalThis.__seancesCtx!;
    // any-justify: contexte de test global partagé entre hooks et tests
    const cree = await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        affectationId: ctx.affectationId,
      })
      .expect(201);

    const detail = await ctx.agent
      .get('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .expect(200);

    expect(detail.body.data.id).toBe(cree.body.data.id);
    expect(detail.body.data.creneauDebut.id).toBe(ctx.creneauId);
    expect(detail.body.data.salle.id).toBe(ctx.salleId);
  });

  it('GET /seances/:id : introuvable (404)', async () => {
    const ctx = globalThis.__seancesCtx!;
    // any-justify: contexte de test global partagé entre hooks et tests
    await ctx.agent
      .get('/api/v1/seances/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .expect(404);
  });

  it('PATCH /seances/:id : modifie une seance (200)', async () => {
    const ctx = globalThis.__seancesCtx!;
    // any-justify: contexte de test global partagé entre hooks et tests
    const cree = await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        affectationId: ctx.affectationId,
      })
      .expect(201);

    const modifiee = await ctx.agent
      .patch('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({ nbCreneaux: 2 })
      .expect(200);

    expect(modifiee.body.data.nbCreneaux).toBe(2);

    const audit = await ctx.prisma.journalAudit.findFirst({
      where: { entite: 'Seance', entiteId: cree.body.data.id, action: 'MODIFICATION' },
    });
    expect(audit).not.toBeNull();
  });

  it('DELETE /seances/:id : supprime une seance (200)', async () => {
    const ctx = globalThis.__seancesCtx!;
    // any-justify: contexte de test global partagé entre hooks et tests
    const cree = await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        salleId: ctx.salleId,
        affectationId: ctx.affectationId,
      })
      .expect(201);

    const supprimee = await ctx.agent
      .delete('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .expect(200);

    expect(supprimee.body.data.id).toBe(cree.body.data.id);

    const existe = await ctx.prisma.seance.findUnique({ where: { id: cree.body.data.id } });
    expect(existe).toBeNull();

    const audit = await ctx.prisma.journalAudit.findFirst({
      where: { entite: 'Seance', entiteId: cree.body.data.id, action: 'SUPPRESSION' },
    });
    expect(audit).not.toBeNull();
  });

  it('DELETE /seances/:id : version publiee refuse (409)', async () => {
    // any-justify: contexte de test global partagé entre hooks et tests
    const ctx = globalThis.__seancesCtx!;
    const cree = await ctx.agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .send({
        versionId: ctx.versionId,
        jour: 1,
        creneauDebutId: ctx.creneauId,
        nbCreneaux: 1,
        affectationId: ctx.affectationId,
      })
      .expect(201);

    await ctx.prisma.version.update({
      where: { id: ctx.versionId },
      data: { etat: 'valid_dir' },
    });

    await ctx.agent
      .delete('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + ctx.tokenRdep)
      .expect(409);

    await ctx.prisma.version.update({
      where: { id: ctx.versionId },
      data: { etat: 'edition' },
    });
  });
});