// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Client } from 'pg';
import { hash, argon2id } from 'argon2';
import crypto from 'crypto';

let clientResolve: Client | null = null;
let connected = false;

function getClient(): Client {
  if (clientResolve) {
    return clientResolve;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL est requise pour exécuter le seed');
  }
  clientResolve = new Client({ connectionString });
  return clientResolve;
}

async function query(sql: string, params: unknown[] = []): Promise<any[]> {
  const client = getClient();
  if (!connected) {
    await client.connect();
    connected = true;
  }
  const res = await client.query(sql, params);
  return res.rows;
}

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

async function queryOne(sql: string, params: unknown[] = []): Promise<any | null> {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function getOrCreate(
  table: string,
  whereCol: string,
  whereValue: unknown,
  insertCols: Record<string, unknown>,
  updateCols: Record<string, unknown>,
  withTimestamps = true,
): Promise<any> {
  const existe = await queryOne(
    `SELECT * FROM "${table}" WHERE "${whereCol}" = $1 LIMIT 1`,
    [whereValue],
  );
  if (existe) {
    if (Object.keys(updateCols).length > 0) {
      const sets = Object.keys(updateCols)
        .map((k, i) => `"${k}" = $${i + 2}`)
        .join(', ');
      const params: unknown[] = [whereValue, ...Object.values(updateCols)];
      if (withTimestamps) {
        params.push(new Date());
        await query(
          `UPDATE "${table}" SET ${sets}, "updatedAt" = $${params.length} WHERE "${whereCol}" = $1`,
          params,
        );
      } else {
        await query(
          `UPDATE "${table}" SET ${sets} WHERE "${whereCol}" = $1`,
          params,
        );
      }
    }
    const result = await queryOne(
      `SELECT * FROM "${table}" WHERE "${whereCol}" = $1 LIMIT 1`,
      [whereValue],
    );
    if (!result) {
      throw new Error(
        `getOrCreate: introuvable après mise à jour dans "${table}" où "${whereCol}" = ${String(whereValue)}`,
      );
    }
    return result;
  }
  const now = new Date();
  const idFromInput = insertCols.id ? String(insertCols.id) : null;
  const id = idFromInput ?? crypto.randomUUID();
  const cols: string[] = ['"id"'];
  const vals: unknown[] = [id];
  if (withTimestamps) {
    cols.push('"createdAt"'); vals.push(now);
    cols.push('"updatedAt"'); vals.push(now);
  }
  for (const [k, v] of Object.entries(insertCols)) {
    if (k === 'id') continue;
    cols.push(`"${k}"`); vals.push(v);
  }
  await query(
    `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.map((_, i) => `$${i + 1}`).join(', ')})`,
    vals,
  );
  const result2 = await queryOne(`SELECT * FROM "${table}" WHERE "id" = $1 LIMIT 1`, [id]);
  if (!result2) {
    throw new Error(
      `getOrCreate: introuvable après insertion dans "${table}" avec id ${String(id)}`,
    );
  }
  return result2;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le seed de développement est interdit en production');
  }
  const motDePasseDemo = resoudreMotDePasseDemo();
  const motDePasseHash = await hash(motDePasseDemo, ARGON2_OPTIONS);  const roles = [];
  for (const [code, libelle] of [
    ['admin', 'Administrateur'],
    ['gest', 'Gestionnaire des emplois du temps'],
    ['rdep', 'Responsable de département'],
    ['dir', 'Direction'],
  ]) {
    roles.push(await getOrCreate('Role', 'code', code, { code, libelle }, { libelle }, false));
  }
  const etablissement = await getOrCreate(
    'Etablissement',
    'code',
    'TAKT',
    { code: 'TAKT', libelle: 'Université de Takt' },
    { libelle: 'Université de Takt' },
  );
  const departements = [];
  for (const [code, libelle] of [
    ['INFO', 'Informatique'],
    ['MATH', 'Mathématiques'],
    ['PHYS', 'Physique'],
  ]) {
    departements.push(await getOrCreate(
      'Departement',
      'code',
      code,
      { code, libelle, etablissementId: etablissement.id },
      { libelle, etablissementId: etablissement.id },
    ));
  }
  const annee = await getOrCreate(
    'AnneeUniversitaire',
    'libelle',
    '2026-2027',
    {
      libelle: '2026-2027',
      dateDebut: new Date('2026-09-01T00:00:00.000Z'),
      dateFin: new Date('2027-08-31T00:00:00.000Z'),
    },
    {},
    false,
  );
  const semestres = [];
  for (const numero of [1, 2]) {
    semestres.push(await getOrCreate('Semestre', 'numero', numero, {
      numero,
      anneeUniversitaireId: annee.id,
      dateDebut: new Date(numero === 1 ? '2026-10-01T00:00:00.000Z' : '2027-02-01T00:00:00.000Z'),
      dateFin: new Date(numero === 1 ? '2027-01-31T00:00:00.000Z' : '2027-06-30T00:00:00.000Z'),
    }, {}, false));
  }
  const roleByCode = new Map(roles.map((r: any) => [r.code, r]));
  const deptByCode = new Map(departements.map((d: any) => [d.code, d]));
  const listeUtilisateurs = [
    { email: 'admin@takt.internal', nom: 'Admin', prenom: 'Système', role: 'admin', departement: 'INFO' },
    { email: 'gest@takt.internal', nom: 'Gestion', prenom: 'Temps', role: 'gest', departement: null },
    { email: 'rdep@takt.internal', nom: 'Resp', prenom: 'Département', role: 'rdep', departement: 'INFO' },
    { email: 'dir@takt.internal', nom: 'Direction', prenom: 'Établissement', role: 'dir', departement: null },
  ];
  const utilisateurs = [];
  for (const u of listeUtilisateurs) {
    const role = roleByCode.get(u.role);
    if (!role) {
      throw new Error(`Le rôle ${u.role} est introuvable`);
    }
    const departement = u.departement ? (deptByCode.get(u.departement) ?? null) : null;
    const existe = await queryOne('SELECT * FROM "Utilisateur" WHERE "email" = $1 LIMIT 1', [u.email]);
    if (existe) {
      await query(
        'UPDATE "Utilisateur" SET "motDePasseHash" = $2, "nom" = $3, "prenom" = $4, "roleId" = $5, "departementId" = $6, "estActif" = $7, "updatedAt" = $8 WHERE "email" = $1',
        [u.email, motDePasseHash, u.nom, u.prenom, role.id, departement?.id ?? null, true, new Date()],
      );
      utilisateurs.push(await queryOne('SELECT * FROM "Utilisateur" WHERE "email" = $1 LIMIT 1', [u.email]));
    } else {
      const id = crypto.randomUUID();
      const now = new Date();
      await query(
        'INSERT INTO "Utilisateur" ("id","createdAt","updatedAt","email","nom","prenom","roleId","departementId","estActif","motDePasseHash") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [id, now, now, u.email, u.nom, u.prenom, role.id, departement?.id ?? null, true, motDePasseHash],
      );
      utilisateurs.push(await queryOne('SELECT * FROM "Utilisateur" WHERE "id" = $1 LIMIT 1', [id]));
    }
  }  const parcours = [];
  for (const [code, libelle, deptIdx] of [
    ['L1-INFO', 'Licence 1 Informatique', 0],
    ['L2-INFO', 'Licence 2 Informatique', 0],
    ['L3-MATH', 'Licence 3 Mathématiques', 1],
  ]) {
    parcours.push(await getOrCreate('Parcours', 'code', code, {
      code, libelle, departementId: departements[deptIdx].id,
    }, { libelle, departementId: departements[deptIdx].id }));
  }
  const niveaux = [];
  for (const [code, libelle, parcoursIdx] of [
    ['L1', 'Licence 1ère année', 0],
    ['L2', 'Licence 2ème année', 1],
    ['L3-MATH', 'Licence 3ème année Mathématiques', 2],
  ]) {
    niveaux.push(await getOrCreate('Niveau', 'code', code, {
      code, libelle, parcoursId: parcours[parcoursIdx].id,
    }, { libelle, parcoursId: parcours[parcoursIdx].id }));
  }
  const groupes = [];
  for (const [code, libelle, niveauIdx] of [
    ['TD1-A', 'TD Groupe A L1', 0],
    ['TD1-B', 'TD Groupe B L1', 0],
    ['TD2-A', 'TD Groupe A L2', 1],
    ['TD2-B', 'TD Groupe B L2', 1],
    ['CM3-A', 'CM Groupe A L3', 2],
  ]) {
    groupes.push(await getOrCreate('Groupe', 'code', code, {
      code, libelle, niveauId: niveaux[niveauIdx].id,
    }, { libelle }));
  }
  const typesEnseignement = [];
  for (const [code, libelle, couleur] of [
    ['CM', 'Cours magistral', '#3b82f6'],
    ['TD', 'Travaux dirigés', '#10b981'],
    ['TP', 'Travaux pratiques', '#f59e0b'],
    ['INFO', 'Informatique', '#8b5cf6'],
  ]) {
    typesEnseignement.push(await getOrCreate('TypeEnseignement', 'code', code, { code, libelle, couleur }, { libelle, couleur }));
  }
  const grades = [];
  for (const [code, libelle] of [
    ['MCF', 'Maître de conférences'],
    ['PR', 'Professeur des universités'],
    ['ATER', 'Attaché temporaire d’enseignement et de recherche'],
  ]) {
    grades.push(await getOrCreate('Grade', 'code', code, { code, libelle }, { libelle }));
  }
  const modules = [];
  for (const [code, libelle, typeIdx, gradeIdx] of [
    ['ALGO-101', 'Algo 101', 0, 0],
    ['MATH-101', 'Math 101', 1, 1],
    ['PHYS-101', 'Phys 101', 2, 2],
  ]) {
    modules.push(await getOrCreate('Module', 'code', code, {
      code, libelle,
      typeEnseignementId: typesEnseignement[typeIdx].id,
      gradeId: grades[gradeIdx].id,
    }, { libelle }));
  }
  const matieres = [];
  for (const [code, libelle, moduleIdx] of [
    ['ALGO', 'Algorithmique', 0],
    ['MATH1', 'Mathématiques 1', 1],
    ['PHYS1', 'Physique 1', 2],
  ]) {
    matieres.push(await getOrCreate('Matiere', 'code', code, {
      code, libelle, moduleId: modules[moduleIdx].id,
    }, { libelle }));
  }
  for (const grade of grades) {
    for (const type of typesEnseignement) {
      const existe = await queryOne(
        'SELECT 1 FROM "GradeTypeEnseignement" WHERE "gradeId" = $1 AND "typeEnseignementId" = $2 LIMIT 1',
        [grade.id, type.id],
      );
      if (!existe) {
        await query(
          'INSERT INTO "GradeTypeEnseignement" ("id","gradeId","typeEnseignementId") VALUES ($1,$2,$3)',
          [crypto.randomUUID(), grade.id, type.id],
        );
      }
    }
  }
  const enseignants = [];
  for (let i = 0; i < 3; i++) {
    const email = `enseignant${i + 1}@takt.internal`;
    const existe = await queryOne('SELECT * FROM "Enseignant" WHERE "email" = $1 LIMIT 1', [email]);
    if (existe) {
      await query(
        'UPDATE "Enseignant" SET "nom" = $2, "prenom" = $3, "gradeId" = $4, "updatedAt" = $5 WHERE "id" = $1',
        [existe.id, `Enseignant ${i + 1}`, 'Prénom', grades[i % grades.length].id, new Date()],
      );
      enseignants.push(await queryOne('SELECT * FROM "Enseignant" WHERE "id" = $1 LIMIT 1', [existe.id]));
    } else {
      const id = crypto.randomUUID();
      const now = new Date();
      await query(
        'INSERT INTO "Enseignant" ("id","createdAt","updatedAt","email","matricule","nom","prenom","gradeId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [id, now, now, email, `ENS${String(i + 1).padStart(3, '0')}`, `Enseignant ${i + 1}`, 'Prénom', grades[i % grades.length].id],
      );
      enseignants.push(await queryOne('SELECT * FROM "Enseignant" WHERE "id" = $1 LIMIT 1', [id]));
    }
  }
  for (const e of enseignants) {
    for (const d of departements) {
      const existe = await queryOne(
        'SELECT 1 FROM "EnseignantDepartement" WHERE "enseignantId" = $1 AND "departementId" = $2 LIMIT 1',
        [e.id, d.id],
      );
      if (!existe) {
        await query(
          'INSERT INTO "EnseignantDepartement" ("enseignantId","departementId") VALUES ($1,$2)',
          [e.id, d.id],
        );
      }
    }
  }  const sites = [];
  for (const [code, libelle] of [
    ['SITE-A', 'Site A'],
    ['SITE-B', 'Site B'],
    ['SITE-C', 'Site C'],
  ]) {
    sites.push(await getOrCreate('Site', 'code', code, { code, libelle }, { libelle }));
  }
  const typesSalle = [];
  for (const [code, libelle] of [
    ['CM', 'Amphithéâtre'],
    ['TD', 'Salle TD'],
    ['TP', 'Salle TP'],
    ['INFO', 'Salle info'],
  ]) {
    typesSalle.push(await getOrCreate('TypeSalle', 'code', code, { code, libelle }, { libelle }));
  }
  const equipements = [];
  for (const [code, libelle] of [
    ['VIDEOPRJ', 'Vidéoprojecteur'],
    ['TABLEAU', 'Tableau'],
    ['ORDI', 'Ordinateur'],
  ]) {
    equipements.push(await getOrCreate('Equipement', 'code', code, { code, libelle }, { libelle }));
  }
  for (let i = 1; i <= 150; i++) {
    const code = `SALLE-${String(i).padStart(3, '0')}`;
    const siteRef = sites[(i - 1) % 3];
    const typeSalleRef = typesSalle[(i - 1) % 4];
    const capacite = typeSalleRef.code === 'CM' ? 120 : typeSalleRef.code === 'TD' ? 30 : typeSalleRef.code === 'TP' ? 24 : 20;
    const salle = await getOrCreate('Salle', 'code', code, {
      code,
      libelle: `Salle ${code}`,
      typeSalleId: typeSalleRef.id,
      siteId: siteRef.id,
      capacite,
    }, { libelle: `Salle ${code}`, typeSalleId: typeSalleRef.id, siteId: siteRef.id, capacite });
    // Re-querir la salle par son code pour s'assurer que l'id correspond
    // à une ligne existante dans la table Salle (gardes contre un état
    // client pg incohérent entre deux appels à main() en CI).
    const salleVerify = await queryOne(
      'SELECT id FROM "Salle" WHERE code = $1 LIMIT 1',
      [code],
    );
    if (!salleVerify) {
      throw new Error(`Salle ${code} introuvable après getOrCreate`);
    }
    const salleId = salleVerify.id;
    await query('DELETE FROM "SalleEquipement" WHERE "salleId" = $1', [salleId]);
    const liens: { salleId: string; equipementId: string; quantite: number }[] = [];
    if (typeSalleRef.code === 'CM' || typeSalleRef.code === 'TD') {
      liens.push({ salleId: salleId, equipementId: equipements[0].id, quantite: 1 });
      liens.push({ salleId: salleId, equipementId: equipements[1].id, quantite: 1 });
      liens.push({ salleId: salleId, equipementId: equipements[2].id, quantite: 1 });
    }
    if (typeSalleRef.code === 'TP' || typeSalleRef.code === 'INFO') {
      liens.push({ salleId: salleId, equipementId: equipements[2].id, quantite: 10 });
    }
    for (const lien of liens) {
      await query(
        'INSERT INTO "SalleEquipement" ("salleId","equipementId","quantite") VALUES ($1,$2,$3)',
        [lien.salleId, lien.equipementId, lien.quantite],
      );
    }
  }  const configId = '00000000-0000-0000-0000-000000000920';
  await getOrCreate('ConfigSysteme', 'id', configId, {
    id: configId,
    pasDeTempsMinutes: 30,
    joursOuvres: '1,2,3,4,5,6',
    creneauxParJour: 24,
  }, { pasDeTempsMinutes: 30, joursOuvres: '1,2,3,4,5,6', creneauxParJour: 24 });
  for (const [variante, libelle, decalage, plage] of [
    ['NORMAL', 'Grille horaire normale', 0, null],
    ['RAMADAN', 'Grille horaire Ramadan (décalée +60 min, plage réduite 120 min)', 60, 120],
  ]) {
    await getOrCreate('CreneauAffichage', 'variante', variante, {
      variante, libelle, decalageMinutes: decalage, plageReduiteMinutes: plage,
    }, { libelle, decalageMinutes: decalage, plageReduiteMinutes: plage });
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
      const existe = await queryOne(
        'SELECT id FROM "Creneau" WHERE "jour" = $1 AND "ordre" = $2 LIMIT 1',
        [jour, ordre],
      );
      if (existe) {
        await query('UPDATE "Creneau" SET "updatedAt" = $2 WHERE "id" = $1', [existe.id, new Date()]);
      } else {
        const id = crypto.randomUUID();
        const now = new Date();
        await query(
          'INSERT INTO "Creneau" ("id","createdAt","updatedAt","jour","ordre","heureDebut","heureFin","dureeMinutes") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [id, now, now, jour, ordre, heureDebut, heureFin, 30],
        );
      }
    }
  }
  console.log(`Seed de développement terminé. ${utilisateurs.length} comptes de démonstration créés/mis à jour.`);
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
      await clientResolve?.end();
    });
}