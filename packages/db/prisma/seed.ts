// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hash, argon2id } from 'argon2';
import crypto from 'crypto';

let connexionStringResolvee: string;
let instancePrisma: PrismaClient;

function resoudreConnexion(): string {
  if (connexionStringResolvee) {
    return connexionStringResolvee;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL est requise pour exécuter le seed');
  }
  connexionStringResolvee = connectionString;
  return connexionStringResolvee;
}

function getPrisma(): PrismaClient {
  if (instancePrisma) {
    return instancePrisma;
  }
  instancePrisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: resoudreConnexion() }),
  });
  return instancePrisma;
}

// any-justify: accès dynamique aux modèles Prisma par nom de chaîne (seed générique).
const db: any = getPrisma();
let tx: any;

const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

function resoudreMotDePasseDemo(): string {
  const motDePasseEnv = process.env.SEED_DEMO_PASSWORD;
  if (motDePasseEnv && motDePasseEnv.trim() !== '') {
    return motDePasseEnv.trim();
  }
  const motDePasseGenere = crypto.randomBytes(16).toString('base64url');
  console.log(
    `SEED_DEMO_PASSWORD non définie. Mot de passe de démonstration généré (à usage unique) : ${motDePasseGenere}`,
  );
  return motDePasseGenere;
}

async function prismaCreate(
  model: string,
  data: Record<string, unknown>,
  withTimestamps = true,
  withId = true,
): Promise<any> {
  const now = new Date();
  const payload: Record<string, unknown> = {};
  if (withId) {
    payload.id = crypto.randomUUID();
  }
  if (withTimestamps) {
    payload.createdAt = now;
    payload.updatedAt = now;
  }
  Object.assign(payload, data);
  if (!withId) {
    await (tx ?? db)[model].create({ data: payload });
    return payload;
  }
  const id = payload.id as string;
  await (tx ?? db)[model].create({ data: payload });
  // adapter-pg ne retourne pas fiablement l'objet créé : on relit en SQL pour
  // disposer d'un id garanti et des valeurs réelles en base.
  const full: any[] = await getPrisma().$queryRawUnsafe(
    `SELECT * FROM "${model}" WHERE "id" = $1 LIMIT 1`,
    id,
  );
  return full[0];
}

async function prismaUpdate(
  model: string,
  id: string,
  data: Record<string, unknown>,
  withTimestamps = true,
): Promise<void> {
  if (Object.keys(data).length === 0 && !withTimestamps) {
    return;
  }
  const now = new Date();
  await (tx ?? db)[model].update({
    where: { id },
    data: { ...data, ...(withTimestamps ? { updatedAt: now } : {}) },
  });
}

async function getOrCreate<T extends { id: string }>(
  model: string,
  whereField: string,
  whereValue: unknown,
  createData: Record<string, unknown>,
  createOpts: { withTimestamps?: boolean; withId?: boolean },
  updateData: Record<string, unknown>,
): Promise<T> {
  const rows: { id: string }[] = await getPrisma().$queryRawUnsafe(
    `SELECT id FROM "${model}" WHERE "${whereField}" = $1 LIMIT 1`,
    whereValue,
  );
  if (rows.length > 0) {
    await prismaUpdate(model, rows[0].id, updateData, createOpts.withTimestamps ?? true);
    const full: any[] = await getPrisma().$queryRawUnsafe(
      `SELECT * FROM "${model}" WHERE "id" = $1 LIMIT 1`,
      rows[0].id,
    );
    return full[0] as T;
  }
  return (await prismaCreate(
    model,
    createData,
    createOpts.withTimestamps ?? true,
    createOpts.withId ?? true,
  )) as T;
}

async function findUniqueSafe(
  model: string,
  whereField: string,
  whereValue: unknown,
): Promise<any | null> {
  const rows: any[] = await getPrisma().$queryRawUnsafe(
    `SELECT * FROM "${model}" WHERE "${whereField}" = $1 LIMIT 1`,
    whereValue,
  );
  return rows.length > 0 ? rows[0] : null;
}

async function etape(nom: string, fn: (t: any) => Promise<void>): Promise<void> {
  tx = db;
  await fn(tx);
  tx = undefined;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le seed de développement est interdit en production');
  }

  const motDePasseDemo = resoudreMotDePasseDemo();
  const motDePasseHash = await hash(motDePasseDemo, ARGON2_OPTIONS);

  let roles: any[];
  let etablissement: any;
  let departements: any[];
  let annee: any;
  // Étape 1 : référentiel de base (rôles, établissement, départements, année)
  await etape('referentiel-base', async () => {
    roles = [];
    for (const [code, libelle] of [
      ['admin', 'Administrateur'],
      ['gest', 'Gestionnaire des emplois du temps'],
      ['rdep', 'Responsable de département'],
      ['dir', 'Direction'],
    ]) {
      roles.push(
        await getOrCreate(
          'Role',
          'code',
          code,
          { code, libelle },
          { withTimestamps: false, withId: true },
          { libelle },
        ),
      );
    }

    etablissement = await getOrCreate(
      'Etablissement',
      'code',
      'TAKT',
      { code: 'TAKT', libelle: 'Université de Takt' },
      {},
      { libelle: 'Université de Takt' },
    );

    departements = [];
    for (const [code, libelle] of [
      ['INFO', 'Informatique'],
      ['MATH', 'Mathématiques'],
      ['PHYS', 'Physique'],
    ]) {
      departements.push(
        await getOrCreate(
          'Departement',
          'code',
          code,
          { code, libelle, etablissementId: etablissement.id },
          {},
          { libelle, etablissementId: etablissement.id },
        ),
      );
    }

    annee = await getOrCreate(
      'AnneeUniversitaire',
      'libelle',
      '2026-2027',
      {
        libelle: '2026-2027',
        dateDebut: new Date('2026-09-01T00:00:00.000Z'),
        dateFin: new Date('2027-08-31T00:00:00.000Z'),
      },
      { withTimestamps: false },
      {},
    );
  });

  let semestres: any[];
  let parcours: any[];
  let niveaux: any[];
  let utilisateurs: any[];

  // Étape 2 : semestres, utilisateurs, parcours, niveaux
  await etape('semestres-utilisateurs-parcours', async () => {
    semestres = [];
    for (const numero of [1, 2]) {
      const s = await getOrCreate(
        'Semestre',
        'numero',
        numero,
        {
          numero,
          anneeUniversitaireId: annee.id,
          dateDebut: new Date(numero === 1 ? '2026-10-01T00:00:00.000Z' : '2027-02-01T00:00:00.000Z'),
          dateFin: new Date(numero === 1 ? '2027-01-31T00:00:00.000Z' : '2027-06-30T00:00:00.000Z'),
        },
        { withTimestamps: false },
        {},
      );
      semestres.push(s);
    }

    const roleByCode = new Map(roles.map((r: any) => [r.code, r]));
    const deptByCode = new Map(departements.map((d: any) => [d.code, d]));

    const listeUtilisateurs = [
      { email: 'admin@takt.internal', nom: 'Admin', prenom: 'Système', role: 'admin', departement: 'INFO' },
      { email: 'gest@takt.internal', nom: 'Gestion', prenom: 'Temps', role: 'gest', departement: null },
      { email: 'rdep@takt.internal', nom: 'Resp', prenom: 'Département', role: 'rdep', departement: 'INFO' },
      { email: 'dir@takt.internal', nom: 'Direction', prenom: 'Établissement', role: 'dir', departement: null },
    ];

    utilisateurs = [];
    for (const u of listeUtilisateurs) {
      const role = roleByCode.get(u.role);
      if (!role) {
        throw new Error(`Le rôle ${u.role} est introuvable`);
      }
      const departement = u.departement ? (deptByCode.get(u.departement) ?? null) : null;

      const existe = await findUniqueSafe('Utilisateur', 'email', u.email);
      if (existe) {
        await prismaUpdate('Utilisateur', existe.id, {
          motDePasseHash,
          nom: u.nom,
          prenom: u.prenom,
          roleId: role.id,
          departementId: departement?.id ?? null,
          estActif: true,
        });
        utilisateurs.push(existe);
      } else {
        const cree = await prismaCreate(
          'Utilisateur',
          {
            email: u.email,
            nom: u.nom,
            prenom: u.prenom,
            roleId: role.id,
            departementId: departement?.id ?? null,
            estActif: true,
            motDePasseHash,
          },
          {},
        );
        utilisateurs.push(cree);
      }
    }

    parcours = [];
    for (const [code, libelle, deptIdx] of [
      ['L1-INFO', 'Licence 1 Informatique', 0],
      ['L2-INFO', 'Licence 2 Informatique', 0],
      ['L3-MATH', 'Licence 3 Mathématiques', 1],
    ]) {
      parcours.push(
        await getOrCreate(
          'Parcours',
          'code',
          code,
          { code, libelle, departementId: departements[deptIdx].id },
          {},
          { libelle, departementId: departements[deptIdx].id },
        ),
      );
    }

    niveaux = [];
    for (const [code, libelle, parcoursIdx] of [
      ['L1', 'Licence 1ère année', 0],
      ['L2', 'Licence 2ème année', 1],
      ['L3-MATH', 'Licence 3ème année Mathématiques', 2],
    ]) {
      niveaux.push(
        await getOrCreate(
          'Niveau',
          'code',
          code,
          { code, libelle, parcoursId: parcours[parcoursIdx].id },
          {},
          { libelle, parcoursId: parcours[parcoursIdx].id },
        ),
      );
    }
  });
  let groupes: any[];
  let typesEnseignement: any[];
  let grades: any[];
  let modules: any[];
  let matieres: any[];
  let enseignants: any[];

  // Étape 3 : groupes, types d'enseignement, grades, modules, matières, enseignants
  await etape('groupes-types-grades-enseignants', async () => {
    groupes = [];
    for (const [code, libelle, niveauIdx] of [
      ['TD1-A', 'TD Groupe A L1', 0],
      ['TD1-B', 'TD Groupe B L1', 0],
      ['TD2-A', 'TD Groupe A L2', 1],
      ['TD2-B', 'TD Groupe B L2', 1],
      ['CM3-A', 'CM Groupe A L3', 2],
    ]) {
      const g = await getOrCreate(
        'Groupe',
        'code',
        code,
        { code, libelle, niveauId: niveaux[niveauIdx].id },
        {},
        { libelle },
      );
      groupes.push(g);
    }

    typesEnseignement = [];
    for (const [code, libelle, couleur] of [
      ['CM', 'Cours magistral', '#3b82f6'],
      ['TD', 'Travaux dirigés', '#10b981'],
      ['TP', 'Travaux pratiques', '#f59e0b'],
      ['INFO', 'Informatique', '#8b5cf6'],
    ]) {
      const te = await getOrCreate(
        'TypeEnseignement',
        'code',
        code,
        { code, libelle, couleur },
        {},
        { libelle, couleur },
      );
      typesEnseignement.push(te);
    }

    grades = [];
    for (const [code, libelle] of [
      ['MCF', 'Maître de conférences'],
      ['PR', 'Professeur des universités'],
      ['ATER', 'Attaché temporaire d’enseignement et de recherche'],
    ]) {
      const g = await getOrCreate(
        'Grade',
        'code',
        code,
        { code, libelle },
        { withTimestamps: false },
        { libelle },
      );
      grades.push(g);
    }

    modules = [];
    for (const [code, libelle, typeIdx, gradeIdx] of [
      ['ALGO-101', 'Algo 101', 0, 0],
      ['MATH-101', 'Math 101', 1, 1],
      ['PHYS-101', 'Phys 101', 2, 2],
    ]) {
      const mod = await getOrCreate(
        'Module',
        'code',
        code,
        {
          code,
          libelle,
          typeEnseignementId: typesEnseignement[typeIdx].id,
          gradeId: grades[gradeIdx].id,
        },
        {},
        { libelle },
      );
      modules.push(mod);
    }

    matieres = [];
    for (const [code, libelle, moduleIdx] of [
      ['ALGO', 'Algorithmique', 0],
      ['MATH1', 'Mathématiques 1', 1],
      ['PHYS1', 'Physique 1', 2],
    ]) {
      const m = await getOrCreate(
        'Matiere',
        'code',
        code,
        { code, libelle, moduleId: modules[moduleIdx].id },
        {},
        { libelle },
      );
      matieres.push(m);
    }

    for (const grade of grades) {
      for (const type of typesEnseignement) {
        const existe = await getPrisma().$queryRawUnsafe<any[]>(
          `SELECT 1 FROM "GradeTypeEnseignement" WHERE "gradeId" = $1 AND "typeEnseignementId" = $2 LIMIT 1`,
          grade.id,
          type.id,
        );
        if (existe.length === 0) {
          await prismaCreate(
            'GradeTypeEnseignement',
            { gradeId: grade.id, typeEnseignementId: type.id },
            false,
            false,
          );
        }
      }
    }

    enseignants = [];
    for (let i = 0; i < 3; i++) {
      const email = `enseignant${i + 1}@takt.internal`;
      const existe = await findUniqueSafe('Enseignant', 'email', email);
      if (existe) {
        await prismaUpdate('Enseignant', existe.id, {
          nom: `Enseignant ${i + 1}`,
          prenom: 'Prénom',
          gradeId: grades[i % grades.length].id,
        });
        enseignants.push(existe);
      } else {
        const e = await prismaCreate(
          'Enseignant',
          {
            email,
            matricule: `ENS${String(i + 1).padStart(3, '0')}`,
            nom: `Enseignant ${i + 1}`,
            prenom: 'Prénom',
            gradeId: grades[i % grades.length].id,
          },
          {},
        );
        enseignants.push(e);
      }
    }

    for (const e of enseignants) {
      for (const d of departements) {
        const existe = await getPrisma().$queryRawUnsafe<any[]>(
          `SELECT 1 FROM "EnseignantDepartement" WHERE "enseignantId" = $1 AND "departementId" = $2 LIMIT 1`,
          e.id,
          d.id,
        );
        if (existe.length === 0) {
          await prismaCreate(
            'EnseignantDepartement',
            { enseignantId: e.id, departementId: d.id },
            false,
            false,
          );
        }
      }
    }
  });
  let sites: any[];
  let typesSalle: any[];
  let equipements: any[];

  // Étape 4 : sites, types de salle, équipements, salles (150) et liens équipement
  await etape('referentiel-salles', async () => {
    sites = [];
    for (const [code, libelle] of [
      ['SITE-A', 'Site A'],
      ['SITE-B', 'Site B'],
      ['SITE-C', 'Site C'],
    ]) {
      const s = await getOrCreate(
        'Site',
        'code',
        code,
        { code, libelle },
        {},
        { libelle },
      );
      sites.push(s);
    }

    typesSalle = [];
    for (const [code, libelle] of [
      ['CM', 'Amphithéâtre'],
      ['TD', 'Salle TD'],
      ['TP', 'Salle TP'],
      ['INFO', 'Salle info'],
    ]) {
      const ts = await getOrCreate(
        'TypeSalle',
        'code',
        code,
        { code, libelle },
        {},
        { libelle },
      );
      typesSalle.push(ts);
    }

    equipements = [];
    for (const [code, libelle] of [
      ['VIDEOPRJ', 'Vidéoprojecteur'],
      ['TABLEAU', 'Tableau'],
      ['ORDI', 'Ordinateur'],
    ]) {
      const eq = await getOrCreate(
        'Equipement',
        'code',
        code,
        { code, libelle },
        {},
        { libelle },
      );
      equipements.push(eq);
    }

    for (let i = 1; i <= 150; i++) {
      const code = `SALLE-${String(i).padStart(3, '0')}`;
      const siteRef = sites[(i - 1) % 3];
      const typeSalleRef = typesSalle[(i - 1) % 4];
      const capacite =
        typeSalleRef.code === 'CM'
          ? 120
          : typeSalleRef.code === 'TD'
            ? 30
            : typeSalleRef.code === 'TP'
              ? 24
              : 20;

      const salle = await getOrCreate(
        'Salle',
        'code',
        code,
        {
          code,
          libelle: `Salle ${code}`,
          typeSalleId: typeSalleRef.id,
          siteId: siteRef.id,
          capacite,
        },
        {},
        {
          libelle: `Salle ${code}`,
          typeSalleId: typeSalleRef.id,
          siteId: siteRef.id,
          capacite,
        },
      );

      await (tx ?? db).SalleEquipement.deleteMany({ where: { salleId: salle.id } });
      const liens: { salleId: string; equipementId: string; quantite: number }[] = [];
      if (typeSalleRef.code === 'CM' || typeSalleRef.code === 'TD') {
        liens.push({ salleId: salle.id, equipementId: equipements[0].id, quantite: 1 });
        liens.push({ salleId: salle.id, equipementId: equipements[1].id, quantite: 1 });
        liens.push({ salleId: salle.id, equipementId: equipements[2].id, quantite: 1 });
      }
      if (typeSalleRef.code === 'TP' || typeSalleRef.code === 'INFO') {
        liens.push({ salleId: salle.id, equipementId: equipements[2].id, quantite: 10 });
      }
      if (liens.length > 0) {
        await (tx ?? db).SalleEquipement.createMany({ data: liens });
      }
    }
  });
  // Étape 5 : configuration système, créneaux d'affichage et créneaux horaires
  await etape('configuration-creneaux', async () => {
    const configId = '00000000-0000-0000-0000-000000000920';
    await getOrCreate(
      'ConfigSysteme',
      'id',
      configId,
      {
        id: configId,
        pasDeTempsMinutes: 30,
        joursOuvres: '1,2,3,4,5,6',
        creneauxParJour: 24,
      },
      { withTimestamps: false },
      {
        pasDeTempsMinutes: 30,
        joursOuvres: '1,2,3,4,5,6',
        creneauxParJour: 24,
      },
    );

    for (const [variante, libelle, decalage, plage] of [
      ['NORMAL', 'Grille horaire normale', 0, null],
      ['RAMADAN', 'Grille horaire Ramadan (décalée +60 min, plage réduite 120 min)', 60, 120],
    ]) {
      await getOrCreate(
        'CreneauAffichage',
        'variante',
        variante,
        { variante, libelle, decalageMinutes: decalage, plageReduiteMinutes: plage },
        {},
        { libelle, decalageMinutes: decalage, plageReduiteMinutes: plage },
      );
    }

    const HEURE_DEBUT_JOUR = 8;
    for (let jour = 1; jour <= 6; jour++) {
      for (let ordre = 1; ordre <= 24; ordre++) {
        const minutesDepuisMinuit = HEURE_DEBUT_JOUR * 60 + (ordre - 1) * 30;
        const hDebut = Math.floor(minutesDepuisMinuit / 60);
        const mDebut = minutesDepuisMinuit % 60;
        const hFin = Math.floor((minutesDepuisMinuit + 30) / 60);
        const mFin = (minutesDepuisMinuit + 30) % 60;
        const heureDebut = new Date(Date.UTC(2026, 0, 1, hDebut, mDebut, 0, 0));
        const heureFin = new Date(Date.UTC(2026, 0, 1, hFin, mFin, 0, 0));

        const existe: any[] = await getPrisma().$queryRawUnsafe(
          `SELECT id FROM "Creneau" WHERE "jour" = $1 AND "ordre" = $2 LIMIT 1`,
          jour,
          ordre,
        );
        if (existe.length > 0) {
          await prismaUpdate('Creneau', existe[0].id, {});
        } else {
          await prismaCreate(
            'Creneau',
            { jour, ordre, heureDebut, heureFin, dureeMinutes: 30 },
            {},
          );
        }
      }
    }
  });

  console.log(
    `Seed de développement terminé. ${utilisateurs.length} comptes de démonstration créés/mis à jour.`,
  );
}

export { main };

if (require.main === module) {
  main()
    .then(() => {
      console.log('Seed de développement terminé.');
      process.exitCode = 0;
    })
    .catch((erreur: unknown) => {
      console.error('Échec du seed de développement.', erreur);
      process.exitCode = 1;
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
