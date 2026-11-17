// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { Agent } from 'supertest';
import { creerPrismaClient, PrismaClient } from '@takt/db';
import { hash as hacherArgon2 } from 'argon2';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { sign as signerRsa } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { PRISMA } from '../../common/di/prisma.token';
import { Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { VersionsModule } from '../../versions/versions.module';
import { CouvertureModule } from './couverture.module';

const DOSSIER_CLES = mkdtempSync(join(tmpdir(), 'takt-couverture-int-jwt-'));
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

describe('Couverture pédagogique (integration, TAKT-L06-09)', () => {
  let application: INestApplication;
  let prisma: PrismaClient;
  let agent: Agent;
  let tokenGest: string;
  let versionId: string;
  let semestreId: string;
  let departementId: string;
  let roleEnseignantId: string;
  let enseignantId: string;
  let matiereId: string;
  let groupeId: string;
  let creneauId: string;
  let etablissementId: string;
  let parcoursId: string;
  let typeEnseignementId: string;
  let gradeId: string;
  let moduleId: string;
  let niveauId: string;

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
        VersionsModule,
        CouvertureModule,
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

    // Génération d'IDs UUID valides pour tous les référentiels
    departementId = randomUUID();
    roleEnseignantId = randomUUID();
    enseignantId = randomUUID();
    matiereId = randomUUID();
    groupeId = randomUUID();
    creneauId = randomUUID();
    etablissementId = randomUUID();
    parcoursId = randomUUID();
    typeEnseignementId = randomUUID();
    gradeId = randomUUID();
    moduleId = randomUUID();
    niveauId = randomUUID();

    const roleGest = await prisma.role.upsert({
      where: { code: 'gest' },
      create: { code: 'gest', libelle: 'Gestionnaire' },
      update: {},
    });

    const hash = await hacherArgon2('MotDePasseTest123!');
    const utilisateurGest = await prisma.utilisateur.upsert({
      where: { email: 'alice.couverture@test.takt' },
      create: {
        email: 'alice.couverture@test.takt',
        motDePasseHash: hash,
        nom: 'Dupont',
        prenom: 'Alice',
        roleId: roleGest.id,
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
    semestreId = semestre.id;

    await creerReferentiels();

    await prisma.creneau.upsert({
      where: { id: creneauId },
      create: {
        id: creneauId,
        jour: 1,
        ordre: 1,
        heureDebut: new Date('2026-09-07T08:00:00Z'),
        heureFin: new Date('2026-09-07T08:30:00Z'),
        dureeMinutes: 30,
      },
      update: {},
    });

    const version = await prisma.version.create({
      data: { anneeId: annee.id, semestreId: semestre.id, etat: 'edition' },
    });
    versionId = version.id;
    tokenGest = creerTokenJwt(utilisateurGest.id, 'gest');
  });

  afterAll(async () => {
    await application.close();
    await prisma.$disconnect();
  });

  async function creerReferentiels() {
    await prisma.etablissement.upsert({
      where: { id: etablissementId },
      create: { id: etablissementId, libelle: 'Établissement test', code: 'ETB' },
      update: {},
    });

    await prisma.departement.upsert({
      where: { id: departementId },
      create: { id: departementId, libelle: 'Département test', code: 'DEP', etablissement: { connect: { id: etablissementId } } },
      update: {},
    });

    await prisma.role.upsert({
      where: { id: roleEnseignantId },
      create: { id: roleEnseignantId, code: 'ENSEIGNANT', libelle: 'Enseignant' },
      update: {},
    });

    await prisma.utilisateur.upsert({
      where: { id: enseignantId },
      create: {
        id: enseignantId,
        email: 'ens.couverture@test.takt',
        motDePasseHash: 'hash',
        nom: 'Ens',
        prenom: 'Test',
        roleId: roleEnseignantId,
        departementId,
        estActif: true,
      },
      update: {},
    });

    await prisma.parcours.upsert({
      where: { id: parcoursId },
      create: { id: parcoursId, libelle: 'Parcours test', code: 'PARC', departement: { connect: { id: departementId } } },
      update: {},
    });

    await prisma.niveau.upsert({
      where: { id: niveauId },
      create: { id: niveauId, libelle: 'L1', code: 'L1', parcours: { connect: { id: parcoursId } } },
      update: {},
    });

    await prisma.groupe.upsert({
      where: { id: groupeId },
      create: { id: groupeId, libelle: 'Groupe test', code: 'GRP', niveau: { connect: { id: niveauId } } },
      update: {},
    });

    await prisma.typeEnseignement.upsert({
      where: { id: typeEnseignementId },
      create: { id: typeEnseignementId, libelle: 'CM', code: 'CM', couleur: '#000000' },
      update: {},
    });

    await prisma.grade.upsert({
      where: { id: gradeId },
      create: { id: gradeId, libelle: 'Licence', code: 'L' },
      update: {},
    });

    await prisma.module.upsert({
      where: { id: moduleId },
      create: {
        id: moduleId,
        libelle: 'Module test',
        code: 'MOD',
        typeEnseignement: { connect: { id: typeEnseignementId } },
        grade: { connect: { id: gradeId } },
      },
      update: {},
    });

    await prisma.matiere.upsert({
      where: { id: matiereId },
      create: { id: matiereId, libelle: 'Matière test', code: 'MAT', module: { connect: { id: moduleId } } },
      update: {},
    });
  }

  async function creerAffectationAvecSeance(
    affectationId: string,
    volumeHebdo: number,
    nbCreneaux: number,
  ) {
    await prisma.affectationPedagogique.create({
      data: {
        id: affectationId,
        versionId,
        semestreId: semestreId,
        departementId,
        enseignantId,
        matiereId,
        groupeId,
        volumeHebdo,
      },
    });
    await prisma.seance.create({
      data: {
        id: randomUUID(),
        versionId,
        affectationId,
        jour: 1,
        creneauDebutId: creneauId,
        nbCreneaux,
      },
    });
  }

  function soumettreValidation() {
    return agent
      .post(`/api/v1/versions/${versionId}/transition`)
      .set('Authorization', `Bearer ${tokenGest}`)
      .send({ action: 'soumettreValidation' });
  }

  it('100 pct : couverture exacte -> 200, transition vers valid_pedag', async () => {
    await creerAffectationAvecSeance(randomUUID(), 10, 20);
    const reponse = await soumettreValidation().expect(200);
    expect(reponse.body.data.etat).toBe('valid_pedag');
  });

  it('97 pct : sous-planification -> 400 VALIDATION_ERROR, aucun changement detat', async () => {
    await prisma.version.update({ where: { id: versionId }, data: { etat: 'edition' } });
    await creerAffectationAvecSeance(randomUUID(), 100, 194);
    const reponse = await soumettreValidation().expect(400);
    const erreur = reponse.body.error ?? reponse.body;
    expect(erreur.code).toBe('VALIDATION_ERROR');
    const v = await prisma.version.findUnique({ where: { id: versionId } });
    expect(v!.etat).toBe('edition');
  });

  it('105 pct : sur-planification -> 400 VALIDATION_ERROR', async () => {
    await prisma.version.update({ where: { id: versionId }, data: { etat: 'edition' } });
    await creerAffectationAvecSeance(randomUUID(), 100, 210);
    const reponse = await soumettreValidation().expect(400);
    const erreur = reponse.body.error ?? reponse.body;
    expect(erreur.code).toBe('VALIDATION_ERROR');
  });

  it('0 pct : aucune seance -> 400 VALIDATION_ERROR', async () => {
    await prisma.version.update({ where: { id: versionId }, data: { etat: 'edition' } });
    await prisma.affectationPedagogique.create({
      data: {
        id: randomUUID(),
        versionId,
        semestreId: semestreId,
        departementId: departementId,
        enseignantId: enseignantId,
        matiereId: matiereId,
        groupeId: groupeId,
        volumeHebdo: 10,
      },
    });
    const reponse = await soumettreValidation().expect(400);
    const erreur = reponse.body.error ?? reponse.body;
    expect(erreur.code).toBe('VALIDATION_ERROR');
  });
});
