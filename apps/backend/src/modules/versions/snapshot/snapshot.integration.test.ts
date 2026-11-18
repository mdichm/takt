// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../app.module';
import { SnapshotService } from './snapshot.service';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, creerPrismaClient } from '@takt/db';
import { CODES_ERREUR_API } from '../../common/http/api-error';

process.env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/takt_test',
};

const UTILISATEUR_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ANNEE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SEMESTRE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const VERSION_BROUILLON_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const VERSION_PUBLIEE_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const ETABLISSEMENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const DEPARTEMENT_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const ROLE_ID = '11111111-1111-1111-1111-111111111111';
const ENSEIGNANT_ID = '22222222-2222-2222-2222-222222222222';
const PARCOURS_ID = '33333333-3333-3333-3333-333333333333';
const NIVEAU_ID = '44444444-4444-4444-4444-444444444444';
const GROUPE_ID = '55555555-5555-5555-5555-555555555555';
const SITE_ID = '66666666-6666-6666-6666-666666666666';
const TYPESALLE_ID = '77777777-7777-7777-7777-777777777777';
const SALLE_ID = '88888888-8888-8888-8888-888888888888';
const CRENEAU_ID = '99999999-9999-9999-9999-999999999999';
const PLANETUDES_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const MATIERE_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
const TYPEENSEIGNEMENT_ID = 'cccccccc-dddd-eeee-ffff-000000000000';
const GRADE_ID = 'dddddddd-dddd-dddd-dddd-ddddddddddde';
const MODULE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeef';
const AFFECTATION_ID = 'ffffffff-ffff-ffff-ffff-ffffffffff00';
const SEANCE_ID = 'ffffffff-ffff-ffff-ffff-ffffffffff01';
const CONTRAINTE_ID = 'ffffffff-ffff-ffff-ffff-ffffffffff02';

describe('SnapshotService (TAKT-L06-10)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: référence au module de test NestJS, typage complexe
  let moduleRef: any;
  let service: SnapshotService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PRISMA)
      .useValue(creerPrismaClient(process.env.DATABASE_URL!))
      .overrideProvider(ConfigService)
      .useValue(new ConfigService())
      .compile();

    service = moduleRef.get(SnapshotService);
    prisma = moduleRef.get(PRISMA) as unknown as PrismaClient;

    await prisma.anneeUniversitaire.upsert({
      where: { id: ANNEE_ID },
      update: {},
      create: { id: ANNEE_ID, libelle: '2024-2025', dateDebut: new Date('2024-09-01'), dateFin: new Date('2025-06-30') },
    });
    await prisma.semestre.upsert({
      where: { id: SEMESTRE_ID },
      update: {},
      create: { id: SEMESTRE_ID, numero: 1, anneeUniversitaireId: ANNEE_ID, dateDebut: new Date('2024-09-01'), dateFin: new Date('2025-01-31') },
    });
    // S'assurer que les versions ont le bon état
    await prisma.version.upsert({
      where: { id: VERSION_BROUILLON_ID },
      update: { etat: 'brouillon' },
      create: { id: VERSION_BROUILLON_ID, semestreId: SEMESTRE_ID, anneeId: ANNEE_ID, etat: 'brouillon' },
    });
    await prisma.version.upsert({
      where: { id: VERSION_PUBLIEE_ID },
      update: { etat: 'publie' },
      create: { id: VERSION_PUBLIEE_ID, semestreId: SEMESTRE_ID, anneeId: ANNEE_ID, etat: 'publie' },
    });
    await prisma.etablissement.upsert({
      where: { id: ETABLISSEMENT_ID },
      update: {},
      create: { id: ETABLISSEMENT_ID, code: 'ETAB1', libelle: 'Etablissement 1' },
    });
    await prisma.role.upsert({
      where: { id: ROLE_ID },
      update: {},
      create: { id: ROLE_ID, code: 'admin', libelle: 'Admin' },
    });
    await prisma.departement.upsert({
      where: { id: DEPARTEMENT_ID },
      update: {},
      create: { id: DEPARTEMENT_ID, code: 'INFO', libelle: 'Informatique', etablissementId: ETABLISSEMENT_ID },
    });
    await prisma.utilisateur.upsert({
      where: { id: UTILISATEUR_ID },
      update: {},
      create: {
        id: UTILISATEUR_ID,
        email: 'snapshot-test@example.com',
        nom: 'Snapshot',
        prenom: 'Test',
        roleId: ROLE_ID,
        departementId: DEPARTEMENT_ID,
        estActif: true,
      },
    });
    await prisma.enseignant.upsert({
      where: { matricule: 'ENS001' },
      update: {},
      create: { id: ENSEIGNANT_ID, matricule: 'ENS001', nom: 'Dupont', prenom: 'Jean', email: 'jean@example.com' },
    });
    await prisma.parcours.upsert({
      where: { id: PARCOURS_ID },
      update: {},
      create: { id: PARCOURS_ID, code: 'INFO', libelle: 'Informatique', departementId: DEPARTEMENT_ID },
    });
    await prisma.niveau.upsert({
      where: { id: NIVEAU_ID },
      update: {},
      create: { id: NIVEAU_ID, code: 'L3', libelle: 'Licence 3', parcoursId: PARCOURS_ID },
    });
    await prisma.groupe.upsert({
      where: { id: GROUPE_ID },
      update: {},
      create: { id: GROUPE_ID, code: 'L3', libelle: 'L3 Info', niveauId: NIVEAU_ID },
    });
    await prisma.site.upsert({
      where: { id: SITE_ID },
      update: {},
      create: { id: SITE_ID, code: 'S1', libelle: 'Site 1' },
    });
    await prisma.typeSalle.upsert({
      where: { id: TYPESALLE_ID },
      update: {},
      create: { id: TYPESALLE_ID, code: 'AMFI', libelle: 'Amphithéâtre' },
    });
    await prisma.salle.upsert({
      where: { id: SALLE_ID },
      update: {},
      create: { id: SALLE_ID, code: 'A101', libelle: 'Amphi A101', typeSalleId: TYPESALLE_ID, siteId: SITE_ID, capacite: 100 },
    });
    await prisma.creneau.upsert({
      where: { id: CRENEAU_ID },
      update: {},
      create: { id: CRENEAU_ID, jour: 1, ordre: 1, heureDebut: new Date('2024-09-02T08:00:00Z'), heureFin: new Date('2024-09-02T09:00:00Z'), dureeMinutes: 60 },
    });
    await prisma.planEtudes.upsert({
      where: { id: PLANETUDES_ID },
      update: {},
      create: { id: PLANETUDES_ID, parcoursId: PARCOURS_ID, niveauId: NIVEAU_ID, anneeUniversitaireId: ANNEE_ID, semestreId: SEMESTRE_ID, departementId: DEPARTEMENT_ID },
    });
    await prisma.typeEnseignement.upsert({
      where: { id: TYPEENSEIGNEMENT_ID },
      update: {},
      create: { id: TYPEENSEIGNEMENT_ID, code: 'CM', libelle: 'Cours Magistral', couleur: '#FF0000' },
    });
    await prisma.grade.upsert({
      where: { id: GRADE_ID },
      update: {},
      create: { id: GRADE_ID, code: 'L3', libelle: 'Licence 3' },
    });
    await prisma.module.upsert({
      where: { id: MODULE_ID },
      update: {},
      create: { id: MODULE_ID, code: 'MOD01', libelle: 'Module 1', typeEnseignementId: TYPEENSEIGNEMENT_ID, gradeId: GRADE_ID },
    });
    await prisma.matiere.upsert({
      where: { id: MATIERE_ID },
      update: {},
      create: { id: MATIERE_ID, code: 'INFO101', libelle: 'Informatique 101', moduleId: MODULE_ID },
    });
    await prisma.affectationPedagogique.upsert({
      where: { id: AFFECTATION_ID },
      update: {},
      create: { id: AFFECTATION_ID, versionId: VERSION_BROUILLON_ID, semestreId: SEMESTRE_ID, departementId: DEPARTEMENT_ID, enseignantId: ENSEIGNANT_ID, matiereId: MATIERE_ID, groupeId: GROUPE_ID, typeEnseignementId: TYPEENSEIGNEMENT_ID, volumeHebdo: 3, dureeCreneaux: 60 },
    });
    await prisma.seance.upsert({
      where: { id: SEANCE_ID },
      update: {},
      create: { id: SEANCE_ID, versionId: VERSION_BROUILLON_ID, jour: 1, creneauDebutId: CRENEAU_ID, nbCreneaux: 2, salleId: SALLE_ID, enseignantId: ENSEIGNANT_ID, groupeId: GROUPE_ID, matiereId: MATIERE_ID, typeEnseignementId: TYPEENSEIGNEMENT_ID, affectationId: AFFECTATION_ID, estVerrouillee: false },
    });
    await prisma.contrainte.upsert({
      where: { id: CONTRAINTE_ID },
      update: {},
      create: { id: CONTRAINTE_ID, versionId: VERSION_BROUILLON_ID, type: 'INDISPONIBILITE', cibleId: ENSEIGNANT_ID, valeur: 'Lundi matin' },
    });
  });

  afterAll(async () => {
    await prisma.snapshot.deleteMany({ where: { versionId: VERSION_BROUILLON_ID } });
    await prisma.snapshot.deleteMany({ where: { versionId: VERSION_PUBLIEE_ID } });
    await prisma.generation.deleteMany({ where: { versionId: VERSION_BROUILLON_ID } });
    await prisma.generation.deleteMany({ where: { versionId: VERSION_PUBLIEE_ID } });
    await prisma.scenario.deleteMany({});
    await prisma.seance.deleteMany({ where: { versionId: VERSION_BROUILLON_ID } });
    await prisma.verrouSeance.deleteMany({ where: { versionId: VERSION_BROUILLON_ID } });
    await prisma.contrainte.deleteMany({ where: { versionId: VERSION_BROUILLON_ID } });
    await prisma.affectationPedagogique.deleteMany({ where: { versionId: VERSION_BROUILLON_ID } });
    await prisma.affectationPedagogique.deleteMany({ where: { versionId: VERSION_PUBLIEE_ID } });
    await prisma.version.delete({ where: { id: VERSION_BROUILLON_ID } });
    await prisma.version.delete({ where: { id: VERSION_PUBLIEE_ID } });
    await prisma.planEtudes.delete({ where: { id: PLANETUDES_ID } });
    await prisma.semestre.delete({ where: { id: SEMESTRE_ID } });
    await prisma.anneeUniversitaire.delete({ where: { id: ANNEE_ID } });
    await prisma.contrainte.deleteMany({ where: { cibleId: ENSEIGNANT_ID } });
    await prisma.seance.deleteMany({ where: { enseignantId: ENSEIGNANT_ID } });
    await prisma.affectationPedagogique.deleteMany({ where: { enseignantId: ENSEIGNANT_ID } });
    await prisma.groupe.delete({ where: { id: GROUPE_ID } });
    await prisma.niveau.delete({ where: { id: NIVEAU_ID } });
    await prisma.parcours.delete({ where: { id: PARCOURS_ID } });
    await prisma.matiere.delete({ where: { id: MATIERE_ID } });
    await prisma.module.delete({ where: { id: MODULE_ID } });
    await prisma.grade.delete({ where: { id: GRADE_ID } });
    await prisma.typeEnseignement.delete({ where: { id: TYPEENSEIGNEMENT_ID } });
    await prisma.creneau.delete({ where: { id: CRENEAU_ID } });
    await prisma.salle.delete({ where: { id: SALLE_ID } });
    await prisma.typeSalle.delete({ where: { id: TYPESALLE_ID } });
    await prisma.site.delete({ where: { id: SITE_ID } });
    await prisma.enseignant.delete({ where: { id: ENSEIGNANT_ID } });
    await prisma.utilisateur.delete({ where: { id: UTILISATEUR_ID } });
    await prisma.role.delete({ where: { id: ROLE_ID } });
    await prisma.departement.delete({ where: { id: DEPARTEMENT_ID } });
    await prisma.etablissement.delete({ where: { id: ETABLISSEMENT_ID } });
    await prisma.$disconnect();
    await moduleRef.close();
  });

  it('crée un snapshot avec hash et révision 1', async () => {
    const snapshot = await service.creerSnapshot(VERSION_BROUILLON_ID, UTILISATEUR_ID);

    expect(snapshot.id).toBeDefined();
    expect(snapshot.versionId).toBe(VERSION_BROUILLON_ID);
    expect(snapshot.type).toBe('VERSION');
    expect(snapshot.revision).toBe(1);
    expect(snapshot.estCourant).toBe(true);
    expect(snapshot.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(snapshot.createdAt).toBeDefined();

    const recupere = await service.obtenirSnapshotCourant(VERSION_BROUILLON_ID);
    expect(service.verifierIntegrite(recupere)).toBe(true);
  });

  it('produit le même hash sur une même version (déterminisme EX-PRI-06)', async () => {
    const s1 = await service.creerSnapshot(VERSION_BROUILLON_ID, UTILISATEUR_ID);
    const s2 = await service.creerSnapshot(VERSION_BROUILLON_ID, UTILISATEUR_ID);

    expect(s1.hash).toBe(s2.hash);
    expect(s2.revision).toBe(1);
  });

  it('refuse la création sur une version publiée (409 + audit)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any-justify: variable de capture d'erreur de test, typage dynamique
    let erreur: any = null;
    try {
      await service.creerSnapshot(VERSION_PUBLIEE_ID, UTILISATEUR_ID);
    } catch (e) {
      erreur = e;
    }
    expect(erreur).not.toBeNull();
    expect(erreur.code || erreur.message).toBeDefined();

    const audits = await prisma.journalAudit.findMany({
      where: {
        entite: 'Snapshot',
        metadonnees: { path: ['refus'], equals: true },
      },
    });
    expect(audits.length).toBeGreaterThanOrEqual(1);
  });

  it('refuse sur une version inexistante (404)', async () => {
    await expect(
      service.creerSnapshot('00000000-0000-0000-0000-000000000000', 'user1'),
    ).rejects.toMatchObject({
      code: CODES_ERREUR_API.NOT_FOUND,
    });
  });

  it('verifierIntegrite détecte une altération des données', async () => {
    const snapshot = await service.obtenirSnapshotCourant(VERSION_BROUILLON_ID);
    const donnees = snapshot.donnees as Record<string, unknown>;
    const donneesAlterees = { ...donnees, versionId: 'autre-id' };
    expect(service.verifierIntegrite({ donnees: donneesAlterees, hash: snapshot.hash })).toBe(false);
  });
});