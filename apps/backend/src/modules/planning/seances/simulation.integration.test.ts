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
import { PRISMA } from '../../common/di/prisma.token';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../app.module';
import { TokenService } from '../../../modules/auth/token.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

interface SimulationTestCtx {
  application: INestApplication;
  prisma: ReturnType<typeof creerPrismaClient>;
  agent: Agent;
  tokenAdmin: string;
  tokenRdep: string;
  departementId: string;
  anneeUniversitaireId: string;
  semestreId: string;
  versionId: string;
  matiereId: string;
  typeEnseignementId: string;
  enseignantId: string;
  groupeId: string;
  salleId: string;
  creneauId: string;
  affectationId: string;
  seanceId: string;
}

declare global {
  var __simulationCtx: SimulationTestCtx | undefined;
}

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-simulation-int-jwt-'));
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

describe('Simulation d alternatives (TAKT-L06-06)', () => {
  let application: INestApplication;
  let prisma: ReturnType<typeof creerPrismaClient>;
  let agent: Agent;
  let tokenAdmin: string;
  let seanceId: string;
  let versionId: string;
  let anneeUniversitaireId: string;

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

    tokenAdmin = tokenService.signAccessToken({
      sub: admin.id,
      role: 'admin',
      departementIds: [],
    }).token;

    const etablissement = await prisma.etablissement.upsert({
      where: { code: 'ETAB01' },
      update: {},
      create: { code: 'ETAB01', libelle: 'Etablissement test' },
    });
    const departement = await prisma.departement.upsert({
      where: { code: 'DEP01' },
      update: {},
      create: { code: 'DEP01', libelle: 'Departement test', etablissementId: etablissement.id },
    });
    const anneeUniversitaire = await prisma.anneeUniversitaire.upsert({
      where: { libelle: '2026-2027' },
      update: {},
      create: { libelle: '2026-2027', dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-06-30') },
    });
    anneeUniversitaireId = anneeUniversitaire.id;
    const semestre = await prisma.semestre.upsert({
      where: { anneeUniversitaireId_numero: { anneeUniversitaireId: anneeUniversitaire.id, numero: 1 } },
      update: {},
      create: { numero: 1, anneeUniversitaireId: anneeUniversitaire.id, dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-01-31') },
    });
    const parcours = await prisma.parcours.upsert({
      where: { code: 'INFO' },
      update: {},
      create: { code: 'INFO', libelle: 'Informatique', departementId: departement.id },
    });
    const niveau = await prisma.niveau.upsert({
      where: { code: 'L1' },
      update: {},
      create: { code: 'L1', libelle: 'Licence 1', parcoursId: parcours.id },
    });
    const groupe = await prisma.groupe.upsert({
      where: { code: 'L1A' },
      update: {},
      create: { code: 'L1A', libelle: 'L1 A', niveauId: niveau.id },
    });
    const typeSalle = await prisma.typeSalle.upsert({
      where: { code: 'CM' },
      update: {},
      create: { code: 'CM', libelle: 'Cours magistral' },
    });
    const site = await prisma.site.upsert({
      where: { code: 'SITE1' },
      update: {},
      create: { code: 'SITE1', libelle: 'Site 1' },
    });
    const salle = await prisma.salle.upsert({
      where: { code: 'S101' },
      update: {},
      create: { code: 'S101', libelle: 'Salle 101', capacite: 30, typeSalleId: typeSalle.id, siteId: site.id },
    });
    const typeEnseignement = await prisma.typeEnseignement.upsert({
      where: { code: 'CM' },
      update: {},
      create: { code: 'CM', libelle: 'Cours magistral', couleur: '#FF0000' },
    });
    const grade = await prisma.grade.upsert({
      where: { code: 'G1' },
      update: {},
      create: { code: 'G1', libelle: 'Grade 1' },
    });
    const module = await prisma.module.upsert({
      where: { code: 'MOD01' },
      update: {},
      create: { code: 'MOD01', libelle: 'Module test', typeEnseignementId: typeEnseignement.id, gradeId: grade.id },
    });
    const enseignant = await prisma.enseignant.upsert({
      where: { matricule: 'ENS01' },
      update: {},
      create: { matricule: 'ENS01', nom: 'Dupond', prenom: 'Jean', email: 'jean.dupond@takt.test', gradeId: grade.id },
    });
    const matiere = await prisma.matiere.upsert({
      where: { code: 'MATH' },
      update: {},
      create: { code: 'MATH', libelle: 'Mathematiques', moduleId: module.id },
    });
    const creneau = await prisma.creneau.upsert({
      where: { id: '11111111-1111-1111-1111-111111111001' },
      update: {},
      create: { id: '11111111-1111-1111-1111-111111111001', jour: 1, ordre: 1, heureDebut: new Date('2026-09-07T08:00:00Z'), heureFin: new Date('2026-09-07T09:00:00Z'), dureeMinutes: 60 },
    });

    const version = await prisma.version.upsert({
      where: { id: '33333333-3333-3333-3333-333333333001' },
      update: {},
      create: { id: '33333333-3333-3333-3333-333333333001', anneeId: anneeUniversitaire.id, semestreId: semestre.id, etat: 'initial' },
    });

    const affectation = await prisma.affectationPedagogique.upsert({
      where: { id: '44444444-4444-4444-4444-444444444001' },
      update: {},
      create: { id: '44444444-4444-4444-4444-444444444001', versionId: version.id, semestreId: semestre.id, departementId: departement.id, matiereId: matiere.id, enseignantId: enseignant.id, groupeId: groupe.id, typeEnseignementId: typeEnseignement.id, volumeHebdo: 2 },
    });

    const seance = await prisma.seance.create({
      data: {
        id: '22222222-2222-2222-2222-222222222001',
        versionId: version.id,
        jour: 1,
        creneauDebutId: creneau.id,
        nbCreneaux: 1,
        salleId: salle.id,
        enseignantId: enseignant.id,
        groupeId: groupe.id,
        matiereId: matiere.id,
        typeEnseignementId: typeEnseignement.id,
        affectationId: affectation.id,
      },
    });

    seanceId = seance.id;
    versionId = version.id;
  });

  afterAll(async () => {
    await prisma.seance.deleteMany({ where: { id: { in: ['22222222-2222-2222-2222-222222222001'] } } });
    await prisma.affectationPedagogique.deleteMany({ where: { id: '44444444-4444-4444-4444-444444444001' } });
    await prisma.version.deleteMany({ where: { id: '33333333-3333-3333-3333-333333333001' } });
    await prisma.creneau.deleteMany({ where: { id: { in: ['11111111-1111-1111-1111-111111111001', '11111111-1111-1111-1111-111111111002'] } } });
    await prisma.salle.deleteMany({ where: { code: { in: ['S101', 'S102'] } } });
    await prisma.enseignant.deleteMany({ where: { matricule: 'ENS01' } });
    await prisma.matiere.deleteMany({ where: { code: 'MATH' } });
    await prisma.module.deleteMany({ where: { code: 'MOD01' } });
    await prisma.grade.deleteMany({ where: { code: 'G1' } });
    await prisma.typeEnseignement.deleteMany({ where: { code: 'CM' } });
    await prisma.groupe.deleteMany({ where: { code: 'L1A' } });
    await prisma.niveau.deleteMany({ where: { code: 'L1' } });
    await prisma.parcours.deleteMany({ where: { code: 'INFO' } });
    await prisma.departement.deleteMany({ where: { code: 'DEP01' } });
    await prisma.etablissement.deleteMany({ where: { code: 'ETAB01' } });
    await prisma.semestre.deleteMany({ where: { anneeUniversitaireId } });
    await prisma.anneeUniversitaire.deleteMany({ where: { libelle: '2026-2027' } });
    await prisma.utilisateur.deleteMany({ where: { email: { contains: '@takt.test' } } });
    await prisma.role.deleteMany({ where: { code: { in: ['admin', 'rdep'] } } });
    await application.close();
    await prisma.$disconnect();
  });

  it('retourne des alternatives classees pour une seance (200)', async () => {
    const reponse = await agent
      .post(`/api/v1/seances/${seanceId}/simuler`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nbCreneaux: 1 })
      .expect(200);

    expect(reponse.body.data.alternatives).toBeDefined();
    expect(Array.isArray(reponse.body.data.alternatives)).toBe(true);
    expect(reponse.body.data.alternatives.length).toBeGreaterThan(0);
    expect(reponse.body.error).toBeNull();

    const alt = reponse.body.data.alternatives[0];
    expect(alt.candidat).toHaveProperty('jour');
    expect(alt.candidat).toHaveProperty('creneauDebutId');
    expect(alt.candidat).toHaveProperty('nbCreneaux');
    expect(alt.candidat).toHaveProperty('salleId');
    expect(alt.score).toBeGreaterThanOrEqual(0);
    expect(alt.score).toBeLessThanOrEqual(100);
    expect(alt.sousScores).toHaveProperty('continuite');
    expect(alt.sousScores).toHaveProperty('heuresTardives');
    expect(alt.sousScores).toHaveProperty('preferences');
    expect(Array.isArray(alt.conflitsResiduels)).toBe(true);
  });

  it('limite le nombre d alternatives a nbAlternativesMax', async () => {
    const reponse = await agent
      .post(`/api/v1/seances/${seanceId}/simuler`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nbAlternativesMax: 3 })
      .expect(200);

    expect(reponse.body.data.alternatives.length).toBeLessThanOrEqual(3);
  });

  it('retourne 404 pour une seance introuvable', async () => {
    await agent
      .post('/api/v1/seances/00000000-0000-0000-0000-000000000000/simuler')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nbCreneaux: 1 })
      .expect(404);
  });

  it('retourne 409 quand la version n est plus modifiable', async () => {
    await prisma.version.update({
      where: { id: versionId },
      data: { etat: 'publie' },
    });

    await agent
      .post(`/api/v1/seances/${seanceId}/simuler`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nbCreneaux: 1 })
      .expect(409);

    await prisma.version.update({
      where: { id: versionId },
      data: { etat: 'initial' },
    });
  });
});
