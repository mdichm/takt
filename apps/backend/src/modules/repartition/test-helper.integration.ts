// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { generateKeyPairSync } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { hash as hacherArgon2 } from 'argon2';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Agent } from 'supertest';
import { creerPrismaClient } from '@takt/db';
import { PRISMA } from '../common/di/prisma.token';
import { PASSWORD_ARGON2_OPTIONS } from '../../config/password.config';
import { VerificateurJwt } from '../common/guards/jwt-verificateur.interface';
const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-repartition-test-jwt-'));
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

const ADMIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const RDEP_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const GEST_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const DIR_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const DEPARTEMENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const DEPARTEMENT2_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const ETABLISSEMENT_ID = '11111111-1111-1111-1111-111111111111';
const PARCOURS_ID = '22222222-2222-2222-2222-222222222222';
const NIVEAU_ID = '33333333-3333-3333-3333-333333333333';
const GROUPE1_ID = '44444444-4444-4444-4444-444444444444';
const GROUPE2_ID = '55555555-5555-5555-5555-555555555555';
const SEMESTRE_ID = '66666666-6666-6666-6666-666666666666';
const ANNEE_UNIV_ID = '77777777-7777-7777-7777-777777777777';
const VERSION_ID = '88888888-8888-8888-8888-888888888888';
const VERSION2_ID = '99999999-9999-9999-9999-999999999999';
const MATIERE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MATIERE2_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TYPE_ENS_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ENSEIGNANT_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const ENSEIGNANT2_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const PLAN_ETUDES_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const PLAN_ETUDES_MATIERE_ID = '12345678-1234-1234-1234-123456789012';
const MODULE_ID = '11111111-2222-3333-4444-555555555555';
const GRADE_ID = '22222222-3333-4444-5555-666666666666';

process.env.TEST_ADMIN_ID = ADMIN_ID;

const emailUnique = () => `takt-test-${Date.now()}-${Math.random().toString(36).slice(2)}@takt.test`;

export interface ContexteTestRepartition {
  application: INestApplication;
  prisma: ReturnType<typeof creerPrismaClient>;
  agent: Agent;
  tokenAdmin: string;
  tokenRdep: string;
  tokenGest: string;
  tokenDir: string;
  idAdmin: string;
  idRdep: string;
  idGest: string;
  idDir: string;
  departementId: string;
  departement2Id: string;
  semestreId: string;
  versionId: string;
  version2Id: string;
  matiereId: string;
  matiere2Id: string;
  typeEnseignementId: string;
  enseignantId: string;
  enseignant2Id: string;
  groupe1Id: string;
  groupe2Id: string;
  planEtudesId: string;
  planEtudesMatiereId: string;
  moduleId: string;
  gradeId: string;
  idsACleaner: string[];
}

export async function creerContexteTestRepartition(): Promise<ContexteTestRepartition> {
  const { AppModule } = await import('../../app.module');
  const { TokenService } = await import('../../modules/auth/token.service');
  const { JwtAuthGuard } = await import('../common/guards/jwt-auth.guard');
  const { Reflector } = await import('@nestjs/core');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    providers: [Reflector],
  })
    .overrideProvider(PRISMA)
    .useValue(creerPrismaClient(process.env.DATABASE_URL!))
    .compile();

  const application = moduleRef.createNestApplication();
  application.setGlobalPrefix('api/v1');
  await application.init();

  // Récupérer le TokenService et configurer le JwtAuthGuard réel
  const tokenService = moduleRef.get(TokenService);
  const jwtAuthGuard = application.get(JwtAuthGuard, { strict: false });
  if (jwtAuthGuard) {
    // Remplacer le vérificateur par le vrai (propriété privée en lecture seule)
    Object.defineProperty(jwtAuthGuard, 'verificateur', {
      value: {
        verifier: (token: string) => tokenService.verifyAccessToken(token),
      } as VerificateurJwt,
      writable: true,
      configurable: true,
    });
  }

  // Configurer le DepartmentScopeGuard avec le Reflector
  const { DepartmentScopeGuard } = await import('../common/guards/department-scope.guard');
  const deptScopeGuard = application.get(DepartmentScopeGuard, { strict: false });
  if (deptScopeGuard) {
    const reflector = application.get(Reflector);
    Object.defineProperty(deptScopeGuard, 'reflector', {
      value: reflector,
      writable: true,
      configurable: true,
    });
  }

  const prisma = creerPrismaClient(process.env.DATABASE_URL!);
  const agent = request.agent(application.getHttpServer());

  await prisma.role.upsert({ where: { code: 'admin' }, update: {}, create: { code: 'admin', libelle: 'Administrateur' } });
  await prisma.role.upsert({ where: { code: 'gest' }, update: {}, create: { code: 'gest', libelle: 'Gestionnaire' } });
  await prisma.role.upsert({ where: { code: 'rdep' }, update: {}, create: { code: 'rdep', libelle: 'Responsable Département' } });
  await prisma.role.upsert({ where: { code: 'dir' }, update: {}, create: { code: 'dir', libelle: 'Directeur' } });

  const roleAdmin = await prisma.role.findUnique({ where: { code: 'admin' } });
  const roleRdep = await prisma.role.findUnique({ where: { code: 'rdep' } });
  const roleGest = await prisma.role.findUnique({ where: { code: 'gest' } });
  const roleDir = await prisma.role.findUnique({ where: { code: 'dir' } });

  await prisma.etablissement.upsert({
    where: { id: ETABLISSEMENT_ID },
    update: {},
    create: { id: ETABLISSEMENT_ID, code: 'TEST', libelle: 'Établissement Test' },
  });

  await prisma.departement.upsert({
    where: { id: DEPARTEMENT_ID },
    update: {},
    create: { id: DEPARTEMENT_ID, code: 'INFO', libelle: 'Informatique', etablissementId: ETABLISSEMENT_ID },
  });
  await prisma.departement.upsert({
    where: { id: DEPARTEMENT2_ID },
    update: {},
    create: { id: DEPARTEMENT2_ID, code: 'MATH', libelle: 'Mathématiques', etablissementId: ETABLISSEMENT_ID },
  });

  const hash = await hacherArgon2(MOT_DE_PASSE, PASSWORD_ARGON2_OPTIONS);

  const admin = await prisma.utilisateur.upsert({
    where: { id: ADMIN_ID },
    update: {},
    create: { id: ADMIN_ID, email: emailUnique(), nom: 'Admin', prenom: 'Systeme', roleId: roleAdmin!.id, motDePasseHash: hash, estActif: true },
  });
  const rdep = await prisma.utilisateur.upsert({
    where: { id: RDEP_ID },
    update: {},
    create: { id: RDEP_ID, email: emailUnique(), nom: 'Rdep', prenom: 'Test', roleId: roleRdep!.id, motDePasseHash: hash, estActif: true, departementId: DEPARTEMENT_ID },
  });
  const gest = await prisma.utilisateur.upsert({
    where: { id: GEST_ID },
    update: {},
    create: { id: GEST_ID, email: emailUnique(), nom: 'Gest', prenom: 'Test', roleId: roleGest!.id, motDePasseHash: hash, estActif: true },
  });
  const dir = await prisma.utilisateur.upsert({
    where: { id: DIR_ID },
    update: {},
    create: { id: DIR_ID, email: emailUnique(), nom: 'Dir', prenom: 'Test', roleId: roleDir!.id, motDePasseHash: hash, estActif: true },
  });

  // AnneeUniversitaire: libelle (unique), dateDebut, dateFin (pas de code)
  await prisma.anneeUniversitaire.upsert({
    where: { id: ANNEE_UNIV_ID },
    update: {},
    create: { id: ANNEE_UNIV_ID, libelle: '2024-2025', dateDebut: new Date('2024-09-01'), dateFin: new Date('2025-06-30') },
  });

  // Semestre: numero, anneeUniversitaireId, dateDebut, dateFin (pas de libelle)
  await prisma.semestre.upsert({
    where: { id: SEMESTRE_ID },
    update: {},
    create: { id: SEMESTRE_ID, anneeUniversitaireId: ANNEE_UNIV_ID, numero: 1, dateDebut: new Date('2024-09-01'), dateFin: new Date('2025-01-31') },
  });

  // Version: semestreId, etat (pas de nom)
  await prisma.version.upsert({
    where: { id: VERSION_ID },
    update: {},
    create: { id: VERSION_ID, semestreId: SEMESTRE_ID, etat: 'initial' },
  });
  await prisma.version.upsert({
    where: { id: VERSION2_ID },
    update: {},
    create: { id: VERSION2_ID, semestreId: SEMESTRE_ID, etat: 'initial' },
  });

  await prisma.parcours.upsert({
    where: { id: PARCOURS_ID },
    update: {},
    create: { id: PARCOURS_ID, code: 'MIAGE', libelle: 'MIAGE', departementId: DEPARTEMENT_ID },
  });

  // TypeEnseignement: couleur requis (avant Module)
  await prisma.typeEnseignement.upsert({
    where: { id: TYPE_ENS_ID },
    update: {},
    create: { id: TYPE_ENS_ID, code: 'CM', libelle: 'Cours Magistral', couleur: '#1E90FF' },
  });

  // Grade: requis pour Module
  await prisma.grade.upsert({
    where: { id: GRADE_ID },
    update: {},
    create: { id: GRADE_ID, code: 'L3', libelle: 'Licence 3' },
  });

  // Module: typeEnseignementId et gradeId requis
  await prisma.module.upsert({
    where: { id: MODULE_ID },
    update: {},
    create: { id: MODULE_ID, code: 'MOD1', libelle: 'Module Test', typeEnseignementId: TYPE_ENS_ID, gradeId: GRADE_ID },
  });

  await prisma.niveau.upsert({
    where: { id: NIVEAU_ID },
    update: {},
    create: { id: NIVEAU_ID, code: 'L3', libelle: 'Licence 3', parcoursId: PARCOURS_ID },
  });

  // Groupe: pas de effectif
  await prisma.groupe.upsert({
    where: { id: GROUPE1_ID },
    update: {},
    create: { id: GROUPE1_ID, code: 'G1', libelle: 'Groupe 1', niveauId: NIVEAU_ID },
  });
  await prisma.groupe.upsert({
    where: { id: GROUPE2_ID },
    update: {},
    create: { id: GROUPE2_ID, code: 'G2', libelle: 'Groupe 2', niveauId: NIVEAU_ID },
  });

  // Matiere: moduleId requis
  await prisma.matiere.upsert({
    where: { id: MATIERE_ID },
    update: {},
    create: { id: MATIERE_ID, code: 'ALGO', libelle: 'Algorithmique', moduleId: MODULE_ID },
  });
  await prisma.matiere.upsert({
    where: { id: MATIERE2_ID },
    update: {},
    create: { id: MATIERE2_ID, code: 'BDD', libelle: 'Bases de données', moduleId: MODULE_ID },
  });

  await prisma.enseignant.upsert({
    where: { id: ENSEIGNANT_ID },
    update: {},
    create: { id: ENSEIGNANT_ID, matricule: 'ENS001', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@test.takt' },
  });
  await prisma.enseignant.upsert({
    where: { id: ENSEIGNANT2_ID },
    update: {},
    create: { id: ENSEIGNANT2_ID, matricule: 'ENS002', nom: 'Martin', prenom: 'Marie', email: 'marie.martin@test.takt' },
  });

  await prisma.enseignantDepartement.upsert({
    where: { enseignantId_departementId: { enseignantId: ENSEIGNANT_ID, departementId: DEPARTEMENT_ID } },
    update: {},
    create: { enseignantId: ENSEIGNANT_ID, departementId: DEPARTEMENT_ID },
  });
  await prisma.enseignantDepartement.upsert({
    where: { enseignantId_departementId: { enseignantId: ENSEIGNANT2_ID, departementId: DEPARTEMENT_ID } },
    update: {},
    create: { enseignantId: ENSEIGNANT2_ID, departementId: DEPARTEMENT_ID },
  });

  // PlanEtudes: parcoursId, niveauId, anneeUniversitaireId, semestreId, departementId
  await prisma.planEtudes.upsert({
    where: { id: PLAN_ETUDES_ID },
    update: {},
    create: { id: PLAN_ETUDES_ID, parcoursId: PARCOURS_ID, niveauId: NIVEAU_ID, anneeUniversitaireId: ANNEE_UNIV_ID, semestreId: SEMESTRE_ID, departementId: DEPARTEMENT_ID },
  });

  // PlanEtudesMatiere: planEtudesId, matiereId, typeEnseignementId, volumeHoraire, dureeCreneaux, coefficient
  await prisma.planEtudesMatiere.upsert({
    where: { id: PLAN_ETUDES_MATIERE_ID },
    update: {},
    create: { id: PLAN_ETUDES_MATIERE_ID, planEtudesId: PLAN_ETUDES_ID, matiereId: MATIERE_ID, typeEnseignementId: TYPE_ENS_ID, volumeHoraire: 4, dureeCreneaux: 90, coefficient: 1 },
  });

  const loginAdmin = await agent.post('/api/v1/auth/login').send({ email: admin.email, motDePasse: MOT_DE_PASSE });
  const loginRdep = await agent.post('/api/v1/auth/login').send({ email: rdep.email, motDePasse: MOT_DE_PASSE });
  const loginGest = await agent.post('/api/v1/auth/login').send({ email: gest.email, motDePasse: MOT_DE_PASSE });
  const loginDir = await agent.post('/api/v1/auth/login').send({ email: dir.email, motDePasse: MOT_DE_PASSE });

  const tokenAdmin = loginAdmin.body.data.accessToken;
  const tokenRdep = loginRdep.body.data.accessToken;
  const tokenGest = loginGest.body.data.accessToken;
  const tokenDir = loginDir.body.data.accessToken;

  return {
    application,
    prisma,
    agent,
    tokenAdmin,
    tokenRdep,
    tokenGest,
    tokenDir,
    idAdmin: admin.id,
    idRdep: rdep.id,
    idGest: gest.id,
    idDir: dir.id,
    departementId: DEPARTEMENT_ID,
    departement2Id: DEPARTEMENT2_ID,
    semestreId: SEMESTRE_ID,
    versionId: VERSION_ID,
    version2Id: VERSION2_ID,
    matiereId: MATIERE_ID,
    matiere2Id: MATIERE2_ID,
    typeEnseignementId: TYPE_ENS_ID,
    enseignantId: ENSEIGNANT_ID,
    enseignant2Id: ENSEIGNANT2_ID,
    groupe1Id: GROUPE1_ID,
    groupe2Id: GROUPE2_ID,
    planEtudesId: PLAN_ETUDES_ID,
    planEtudesMatiereId: PLAN_ETUDES_MATIERE_ID,
    moduleId: MODULE_ID,
    gradeId: GRADE_ID,
    idsACleaner: [admin.id, rdep.id, gest.id, dir.id],
  };
}

export async function nettoyerContexteTestRepartition(ctx: ContexteTestRepartition) {
  for (const id of ctx.idsACleaner) {
    await ctx.prisma.journalAudit.deleteMany({ where: { utilisateurId: id } });
    await ctx.prisma.sessionRefresh.deleteMany({ where: { utilisateurId: id } });
    await ctx.prisma.utilisateur.deleteMany({ where: { id } });
  }
  await ctx.prisma.affectationPedagogique.deleteMany({});
  await ctx.prisma.$disconnect();
  await ctx.application.close();
}
