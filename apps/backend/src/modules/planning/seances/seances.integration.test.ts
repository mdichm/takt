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
export const PRISMA = Symbol('PRISMA');
import { VerificateurJwt } from '../../../common/guards/jwt-verificateur.interface';
import { AppModule } from '../../../app.module';
import { TokenService } from '../../modules/auth/token.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { DepartmentScopeGuard } from '../../common/guards/department-scope.guard';

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

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const RDEP_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DEPARTEMENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const SEMESTRE_ID = '66666666-6666-6666-6666-666666666666';
const ANNEE_UNIV_ID = '77777777-7777-7777-7777-777777777777';
const VERSION_ID = '88888888-8888-8888-8888-888888888888';
const MATIERE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TYPE_ENS_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ENSEIGNANT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const GROUPE_ID = '44444444-4444-4444-4444-444444444444';
const SALLE_ID = '22222222-2222-2222-2222-222222222222';
const CRENEAU_ID = '33333333-3333-4333-8333-333333333333';
const AFFECTATION_ID = '44444444-4444-4444-8444-444444444444';
const MODULE_ID = '11111111-2222-3333-4444-555555555555';
const NIVEAU_ID = '33333333-3333-3333-3333-333333333333';
const PARCOURS_ID = '22222222-2222-2222-2222-222222222222';

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
      .overrideProvider(PRISMA)
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
        id: ADMIN_ID,
        email: emailUnique(),
        motDePasseHache: hash,
        nom: 'Admin',
        prenom: 'Test',
      },
    });
    await prisma.utilisateurRole.create({
      data: { utilisateurId: ADMIN_ID, roleCode: 'admin' },
    });
    const rdep = await prisma.utilisateur.create({
      data: {
        id: RDEP_ID,
        email: emailUnique(),
        motDePasseHache: hash,
        nom: 'Rdep',
        prenom: 'Test',
      },
    });
    await prisma.utilisateurRole.create({
      data: { utilisateurId: RDEP_ID, roleCode: 'rdep' },
    });

    tokenAdmin = tokenService.generateAccessToken({
      sub: ADMIN_ID,
      email: admin.email,
      roles: ['admin'],
      departementIds: [],
    });
    tokenRdep = tokenService.generateAccessToken({
      sub: RDEP_ID,
      email: rdep.email,
      roles: ['rdep'],
      departementIds: [DEPARTEMENT_ID],
    });

    await prisma.departement.create({
      data: { id: DEPARTEMENT_ID, code: 'DEP01', libelle: 'Departement test' },
    });
    await prisma.anneeUniversitaire.create({
      data: {
        id: ANNEE_UNIV_ID,
        libelle: '2026-2027',
        dateDebut: new Date('2026-09-01'),
        dateFin: new Date('2027-06-30'),
        estCourante: true,
      },
    });
    await prisma.semestre.create({
      data: {
        id: SEMESTRE_ID,
        libelle: 'S1',
        code: 'S1',
        anneeUniversitaireId: ANNEE_UNIV_ID,
        rang: 1,
        dateDebut: new Date('2026-09-01'),
        dateFin: new Date('2027-01-31'),
      },
    });
    await prisma.parcours.create({
      data: {
        id: PARCOURS_ID,
        code: 'INFO',
        libelle: 'Informatique',
        departementId: DEPARTEMENT_ID,
        anneeUniversitaireId: ANNEE_UNIV_ID,
      },
    });
    await prisma.niveau.create({
      data: { id: NIVEAU_ID, code: 'L1', libelle: 'Licence 1', parcoursId: PARCOURS_ID },
    });
    await prisma.groupe.create({
      data: { id: GROUPE_ID, code: 'L1A', libelle: 'L1 A', niveauId: NIVEAU_ID },
    });
    await prisma.typeSalle.create({
      data: { id: 'type-salle-id', code: 'CM', libelle: 'Cours magistral' },
    });
    await prisma.site.create({
      data: { id: 'site-id', code: 'SITE1', libelle: 'Site 1' },
    });
    await prisma.salle.create({
      data: {
        id: SALLE_ID,
        code: 'S101',
        libelle: 'Salle 101',
        typeSalleId: 'type-salle-id',
        capacite: 30,
        siteId: 'site-id',
      },
    });
    await prisma.typeEnseignement.create({
      data: { id: TYPE_ENS_ID, code: 'CM', libelle: 'Cours magistral', couleur: '#FF0000' },
    });
    await prisma.module.create({
      data: { id: MODULE_ID, code: 'MOD1', libelle: 'Module 1', typeEnseignementId: TYPE_ENS_ID },
    });
    await prisma.matiere.create({
      data: { id: MATIERE_ID, code: 'MATH101', libelle: 'Mathematiques', moduleId: MODULE_ID },
    });
    await prisma.enseignant.create({
      data: {
        id: ENSEIGNANT_ID,
        matricule: 'ENS001',
        nom: 'Enseignant',
        prenom: 'Test',
        email: 'enseignant@test.takt',
      },
    });
    await prisma.enseignantDepartement.create({
      data: { enseignantId: ENSEIGNANT_ID, departementId: DEPARTEMENT_ID },
    });
    await prisma.version.create({
      data: {
        id: VERSION_ID,
        libelle: 'Version test',
        etat: 'edition',
        departementId: DEPARTEMENT_ID,
        semestreId: SEMESTRE_ID,
      },
    });
    await prisma.creneau.create({
      data: {
        id: CRENEAU_ID,
        jour: 1,
        ordre: 1,
        heureDebut: new Date('2026-09-01T08:00:00Z'),
        heureFin: new Date('2026-09-01T09:00:00Z'),
        dureeMinutes: 60,
      },
    });
    await prisma.affectationPedagogique.create({
      data: {
        id: AFFECTATION_ID,
        versionId: VERSION_ID,
        semestreId: SEMESTRE_ID,
        departementId: DEPARTEMENT_ID,
        enseignantId: ENSEIGNANT_ID,
        matiereId: MATIERE_ID,
        groupeId: GROUPE_ID,
        typeEnseignementId: TYPE_ENS_ID,
        volumeHebdo: 2,
        dureeCreneaux: 60,
      },
    });
  });

  afterAll(async () => {
    await prisma.seance.deleteMany({ where: { affectationId: AFFECTATION_ID } });
    await prisma.affectationPedagogique.delete({ where: { id: AFFECTATION_ID } });
    await prisma.$disconnect();
    await application.close();
  });

  it('POST /seances : cree une seance (201) + audit', async () => {
    const reponse = await agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({
        versionId: VERSION_ID,
        jour: 1,
        creneauDebutId: CRENEAU_ID,
        nbCreneaux: 1,
        salleId: SALLE_ID,
        enseignantId: ENSEIGNANT_ID,
        groupeId: GROUPE_ID,
        matiereId: MATIERE_ID,
        typeEnseignementId: TYPE_ENS_ID,
        affectationId: AFFECTATION_ID,
      })
      .expect(201);

    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.versionId).toBe(VERSION_ID);
    expect(reponse.body.data.jour).toBe(1);
    expect(reponse.body.data.creneauDebutId).toBe(CRENEAU_ID);
    expect(reponse.body.data.nbCreneaux).toBe(1);
    expect(reponse.body.data.affectationId).toBe(AFFECTATION_ID);
    expect(reponse.body.data.estVerrouillee).toBe(false);

    const audit = await prisma.journalAudit.findFirst({
      where: {
        entite: 'Seance',
        entiteId: reponse.body.data.id,
        action: 'CREATION',
      },
    });
    expect(audit).not.toBeNull();
    expect(audit!.metadonnees).toMatchObject({
      versionId: VERSION_ID,
      jour: 1,
      affectationId: AFFECTATION_ID,
    });
  });

  it('POST /seances : version publiee refuse (409)', async () => {
    await prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'publie' },
    });

    await agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({
        versionId: VERSION_ID,
        jour: 1,
        creneauDebutId: CRENEAU_ID,
        nbCreneaux: 1,
        affectationId: AFFECTATION_ID,
      })
      .expect(409);

    await prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'edition' },
    });
  });

  it('POST /seances : affectation dune autre version refuse (400)', async () => {
    const autreVersion = await prisma.version.create({
      data: {
        id: '99999999-9999-9999-9999-999999999999',
        libelle: 'Autre version',
        etat: 'edition',
        departementId: DEPARTEMENT_ID,
        semestreId: SEMESTRE_ID,
      },
    });
    const autreAffectation = await prisma.affectationPedagogique.create({
      data: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        versionId: '99999999-9999-9999-9999-999999999999',
        semestreId: SEMESTRE_ID,
        departementId: DEPARTEMENT_ID,
        enseignantId: ENSEIGNANT_ID,
        matiereId: MATIERE_ID,
        groupeId: GROUPE_ID,
        typeEnseignementId: TYPE_ENS_ID,
        volumeHebdo: 2,
        dureeCreneaux: 60,
      },
    });

    await agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({
        versionId: VERSION_ID,
        jour: 1,
        creneauDebutId: CRENEAU_ID,
        nbCreneaux: 1,
        affectationId: autreAffectation.id,
      })
      .expect(400);

    await prisma.affectationPedagogique.delete({ where: { id: autreAffectation.id } });
    await prisma.version.delete({ where: { id: autreVersion.id } });
  });

  it('GET /seances/:id : detail (200)', async () => {
    const cree = await agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({
        versionId: VERSION_ID,
        jour: 1,
        creneauDebutId: CRENEAU_ID,
        nbCreneaux: 1,
        salleId: SALLE_ID,
        affectationId: AFFECTATION_ID,
      })
      .expect(201);

    const detail = await agent
      .get('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + tokenRdep)
      .expect(200);

    expect(detail.body.data.id).toBe(cree.body.data.id);
    expect(detail.body.data.creneauDebut.id).toBe(CRENEAU_ID);
    expect(detail.body.data.salle.id).toBe(SALLE_ID);
  });

  it('GET /seances/:id : introuvable (404)', async () => {
    await agent
      .get('/api/v1/seances/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .expect(404);
  });

  it('PATCH /seances/:id : modifie une seance (200)', async () => {
    const cree = await agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({
        versionId: VERSION_ID,
        jour: 1,
        creneauDebutId: CRENEAU_ID,
        nbCreneaux: 1,
        salleId: SALLE_ID,
        affectationId: AFFECTATION_ID,
      })
      .expect(201);

    const modifiee = await agent
      .patch('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({ nbCreneaux: 2 })
      .expect(200);

    expect(modifiee.body.data.nbCreneaux).toBe(2);

    const audit = await prisma.journalAudit.findFirst({
      where: {
        entite: 'Seance',
        entiteId: cree.body.data.id,
        action: 'MODIFICATION',
      },
    });
    expect(audit).not.toBeNull();
  });

  it('DELETE /seances/:id : supprime une seance (200)', async () => {
    const cree = await agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({
        versionId: VERSION_ID,
        jour: 1,
        creneauDebutId: CRENEAU_ID,
        nbCreneaux: 1,
        salleId: SALLE_ID,
        affectationId: AFFECTATION_ID,
      })
      .expect(201);

    const supprimee = await agent
      .delete('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + tokenRdep)
      .expect(200);

    expect(supprimee.body.data.id).toBe(cree.body.data.id);

    const existe = await prisma.seance.findUnique({
      where: { id: cree.body.data.id },
    });
    expect(existe).toBeNull();

    const audit = await prisma.journalAudit.findFirst({
      where: {
        entite: 'Seance',
        entiteId: cree.body.data.id,
        action: 'SUPPRESSION',
      },
    });
    expect(audit).not.toBeNull();
  });

  it('DELETE /seances/:id : version publiee refuse (409)', async () => {
    const cree = await agent
      .post('/api/v1/seances')
      .set('Authorization', 'Bearer ' + tokenRdep)
      .send({
        versionId: VERSION_ID,
        jour: 1,
        creneauDebutId: CRENEAU_ID,
        nbCreneaux: 1,
        affectationId: AFFECTATION_ID,
      })
      .expect(201);

    await prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'publie' },
    });

    await agent
      .delete('/api/v1/seances/' + cree.body.data.id)
      .set('Authorization', 'Bearer ' + tokenRdep)
      .expect(409);

    await prisma.version.update({
      where: { id: VERSION_ID },
      data: { etat: 'edition' },
    });
  });
});