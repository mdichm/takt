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

/**
 * Paramètres Argon2id identiques à ceux du backend (TAKT-L03-01, password.config.ts).
 */
const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

/**
 * Résout le mot de passe de démonstration.
 *
 * - Si `SEED_DEMO_PASSWORD` est définie et non vide : utilisée telle quelle.
 * - Sinon (développement uniquement) : génération aléatoire, affichée une seule fois en console.
 * Aucun mot de passe n'est jamais écrit en dur dans le code (GG-11).
 */
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

/**
 * Récupère un enregistrement par ses critères de recherche, ou le crée s'il
 * n'existe pas, puis applique une mise à jour s'il existait déjà.
 *
 * Contournement du comportement imprévisible de @prisma/adapter-pg sur
 * upsert en CI (PostgreSQL 16) : le chemin UPDATE de upsert peut retourner
 * null, ce qui provoque des violations de clé étrangère ensuite.
 */
async function getOrCreate<T extends { id: string }>(
  findUnique: () => Promise<T | null>,
  create: () => Promise<T>,
  update: (id: string) => Promise<void>,
): Promise<T> {
  const existant = await findUnique();
  if (existant) {
    await update(existant.id);
    return existant;
  }
  return create();
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le seed de développement est interdit en production');
  }

  const motDePasseDemo = resoudreMotDePasseDemo();
  const motDePasseHash = await hash(motDePasseDemo, ARGON2_OPTIONS);

  const roles = await Promise.all(
    [
      ['admin', 'Administrateur'],
      ['gest', 'Gestionnaire des emplois du temps'],
      ['rdep', 'Responsable de département'],
      ['dir', 'Direction'],
    ].map(([code, libelle]) =>
      getOrCreate(
        () => getPrisma().role.findUnique({ where: { code } }),
        () => getPrisma().role.create({ data: { code, libelle } }),
        (id) => getPrisma().role.update({ where: { id }, data: { libelle } }),
      ),
    ),
  );

  const etablissement = await getOrCreate(
    () => getPrisma().etablissement.findUnique({ where: { code: 'TAKT' } }),
    () =>
      getPrisma().etablissement.create({
        data: { code: 'TAKT', libelle: 'Université de Takt' },
      }),
    (id) =>
      getPrisma().etablissement.update({
        where: { id },
        data: { libelle: 'Université de Takt' },
      }),
  );

  const departements = await Promise.all(
    [
      ['INFO', 'Informatique'],
      ['MATH', 'Mathématiques'],
      ['PHYS', 'Physique'],
    ].map(([code, libelle]) =>
      getOrCreate(
        () => getPrisma().departement.findUnique({ where: { code } }),
        () =>
          getPrisma().departement.create({
            data: { code, libelle, etablissementId: etablissement.id },
          }),
        (id) =>
          getPrisma().departement.update({
            where: { id },
            data: { libelle, etablissementId: etablissement.id },
          }),
      ),
    ),
  );

  const annee = await getOrCreate(
    () => getPrisma().anneeUniversitaire.findUnique({ where: { libelle: '2026-2027' } }),
    () =>
      getPrisma().anneeUniversitaire.create({
        data: {
          libelle: '2026-2027',
          dateDebut: new Date('2026-09-01T00:00:00.000Z'),
          dateFin: new Date('2027-08-31T00:00:00.000Z'),
        },
      }),
    () =>
      getPrisma().anneeUniversitaire.update({
        where: { libelle: '2026-2027' },
        data: {},
      }),
  );

  for (const numero of [1, 2]) {
    await getOrCreate(
      () =>
        getPrisma().semestre.findUnique({
          where: { anneeUniversitaireId_numero: { anneeUniversitaireId: annee.id, numero } },
        }),
      () =>
        getPrisma().semestre.create({
          data: {
            numero,
            anneeUniversitaireId: annee.id,
            dateDebut: new Date(numero === 1 ? '2026-10-01' : '2027-02-01'),
            dateFin: new Date(numero === 1 ? '2027-01-31' : '2027-06-30'),
          },
        }),
      (id) => getPrisma().semestre.update({ where: { id }, data: {} }),
    );
  }

  const roleByCode = new Map(roles.map((r) => [r.code, r]));
  const deptByCode = new Map(departements.map((d) => [d.code, d]));

  const utilisateurs = [
    {
      email: 'admin@takt.internal',
      nom: 'Admin',
      prenom: 'Système',
      role: 'admin',
      departement: 'INFO',
    },
    {
      email: 'gest@takt.internal',
      nom: 'Gestion',
      prenom: 'Temps',
      role: 'gest',
      departement: null,
    },
    {
      email: 'rdep@takt.internal',
      nom: 'Resp',
      prenom: 'Département',
      role: 'rdep',
      departement: 'INFO',
    },
    {
      email: 'dir@takt.internal',
      nom: 'Direction',
      prenom: 'Établissement',
      role: 'dir',
      departement: null,
    },
  ];

  for (const u of utilisateurs) {
    const role = roleByCode.get(u.role);
    if (!role) {
      throw new Error(`Le rôle ${u.role} est introuvable`);
    }
    const departement = u.departement ? (deptByCode.get(u.departement) ?? null) : null;

    await getOrCreate(
      () => getPrisma().utilisateur.findUnique({ where: { email: u.email } }),
      () =>
        getPrisma().utilisateur.create({
          data: {
            email: u.email,
            nom: u.nom,
            prenom: u.prenom,
            roleId: role.id,
            departementId: departement?.id ?? null,
            estActif: true,
            motDePasseHash,
          },
        }),
      (id) =>
        getPrisma().utilisateur.update({
          where: { id },
          data: {
            motDePasseHash,
            nom: u.nom,
            prenom: u.prenom,
            roleId: role.id,
            departementId: departement?.id ?? null,
            estActif: true,
          },
        }),
    );
  }

  // Parcours de référence liés aux départements
  const parcours = await Promise.all([
    getOrCreate(
      () => getPrisma().parcours.findUnique({ where: { code: 'L-INFO' } }),
      () =>
        getPrisma().parcours.create({
          data: {
            code: 'L-INFO',
            libelle: 'Licence Informatique',
            departementId: deptByCode.get('INFO')!.id,
          },
        }),
      (id) =>
        getPrisma().parcours.update({
          where: { id },
          data: { libelle: 'Licence Informatique' },
        }),
    ),
    getOrCreate(
      () => getPrisma().parcours.findUnique({ where: { code: 'L-MATH' } }),
      () =>
        getPrisma().parcours.create({
          data: {
            code: 'L-MATH',
            libelle: 'Licence Mathématiques',
            departementId: deptByCode.get('MATH')!.id,
          },
        }),
      (id) =>
        getPrisma().parcours.update({
          where: { id },
          data: { libelle: 'Licence Mathématiques' },
        }),
    ),
  ]);

  // Niveaux de référence
  const niveaux = await Promise.all([
    getOrCreate(
      () => getPrisma().niveau.findUnique({ where: { code: 'L1' } }),
      () =>
        getPrisma().niveau.create({
          data: {
            code: 'L1',
            libelle: 'Licence 1ère année',
            parcoursId: parcours[0].id,
          },
        }),
      (id) =>
        getPrisma().niveau.update({
          where: { id },
          data: { libelle: 'Licence 1ère année' },
        }),
    ),
    getOrCreate(
      () => getPrisma().niveau.findUnique({ where: { code: 'L2' } }),
      () =>
        getPrisma().niveau.create({
          data: {
            code: 'L2',
            libelle: 'Licence 2ème année',
            parcoursId: parcours[0].id,
          },
        }),
      (id) =>
        getPrisma().niveau.update({
          where: { id },
          data: { libelle: 'Licence 2ème année' },
        }),
    ),
    getOrCreate(
      () => getPrisma().niveau.findUnique({ where: { code: 'L3-MATH' } }),
      () =>
        getPrisma().niveau.create({
          data: {
            code: 'L3-MATH',
            libelle: 'Licence 3ème année Mathématiques',
            parcoursId: parcours[1].id,
          },
        }),
      (id) =>
        getPrisma().niveau.update({
          where: { id },
          data: { libelle: 'Licence 3ème année Mathématiques' },
        }),
    ),
  ]);

  // Groupes de référence
  await Promise.all([
    getOrCreate(
      () => getPrisma().groupe.findUnique({ where: { code: 'TD1-A' } }),
      () =>
        getPrisma().groupe.create({
          data: {
            code: 'TD1-A',
            libelle: 'TD Groupe A L1',
            niveauId: niveaux[0].id,
          },
        }),
      (id) =>
        getPrisma().groupe.update({
          where: { id },
          data: { libelle: 'TD Groupe A L1' },
        }),
    ),
    getOrCreate(
      () => getPrisma().groupe.findUnique({ where: { code: 'TD1-B' } }),
      () =>
        getPrisma().groupe.create({
          data: {
            code: 'TD1-B',
            libelle: 'TD Groupe B L1',
            niveauId: niveaux[0].id,
          },
        }),
      (id) =>
        getPrisma().groupe.update({
          where: { id },
          data: { libelle: 'TD Groupe B L1' },
        }),
    ),
    getOrCreate(
      () => getPrisma().groupe.findUnique({ where: { code: 'TP1-A' } }),
      () =>
        getPrisma().groupe.create({
          data: {
            code: 'TP1-A',
            libelle: 'TP Groupe A L1',
            niveauId: niveaux[0].id,
          },
        }),
      (id) =>
        getPrisma().groupe.update({
          where: { id },
          data: { libelle: 'TP Groupe A L1' },
        }),
    ),
  ]);

  // ============================================================================
  // Référentiel salles (TAKT-L04-04) — Sites, Types de salle, Équipements, Salles
  // ============================================================================

  // Sites (3) — créés séquentiellement pour éviter les race conditions
  // avec @prisma/adapter-pg sur les upserts concurrents.
  const sites = [];
  for (const { code, libelle } of [
    { code: 'SITE-RDC', libelle: 'Bâtiment principal – RDC' },
    { code: 'SITE-ETG1', libelle: 'Bâtiment principal – Étage 1' },
    { code: 'SITE-ETG2', libelle: 'Bâtiment principal – Étage 2' },
  ]) {
    sites.push(
      await getOrCreate(
        () => getPrisma().site.findUnique({ where: { code } }),
        () => getPrisma().site.create({ data: { code, libelle } }),
        (id) => getPrisma().site.update({ where: { id }, data: { libelle } }),
      ),
    );
  }

  // Types de salle (4) — créés séquentiellement.
  const typesSalle = [];
  for (const { code, libelle } of [
    { code: 'CM', libelle: 'Cours magistral' },
    { code: 'TD', libelle: 'Travaux dirigés' },
    { code: 'TP', libelle: 'Travaux pratiques' },
    { code: 'INFO', libelle: 'Salle informatique' },
  ]) {
    typesSalle.push(
      await getOrCreate(
        () => getPrisma().typeSalle.findUnique({ where: { code } }),
        () => getPrisma().typeSalle.create({ data: { code, libelle } }),
        (id) => getPrisma().typeSalle.update({ where: { id }, data: { libelle } }),
      ),
    );
  }

  // Équipements (5) — créés séquentiellement.
  const equipements = [];
  for (const { code, libelle } of [
    { code: 'VIDEOPRJ', libelle: 'Vidéo projecteur' },
    { code: 'TABLEAU', libelle: 'Tableau blanc' },
    { code: 'ORDI', libelle: 'Ordinateur poste prof' },
    { code: 'MICRO', libelle: 'Micro sans fil' },
    { code: 'TABLEAU_NUM', libelle: 'Tableau numérique interactif' },
  ]) {
    equipements.push(
      await getOrCreate(
        () => getPrisma().equipement.findUnique({ where: { code } }),
        () => getPrisma().equipement.create({ data: { code, libelle } }),
        (id) => getPrisma().equipement.update({ where: { id }, data: { libelle } }),
      ),
    );
  }

  // 150 salles (SALLE-001 à SALLE-150), réparties sur 3 sites et 4 types
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

    // Préparer les liens équipements selon le type de salle
    const liensEquipements = [];
    if (typeSalleRef.code === 'CM' || typeSalleRef.code === 'TD') {
      liensEquipements.push({ equipement: { connect: { id: equipements[0].id } }, quantite: 1 }); // VIDEOPRJ
      liensEquipements.push({ equipement: { connect: { id: equipements[1].id } }, quantite: 1 }); // TABLEAU
      liensEquipements.push({ equipement: { connect: { id: equipements[2].id } }, quantite: 1 }); // ORDI
    }
    if (typeSalleRef.code === 'TP' || typeSalleRef.code === 'INFO') {
      liensEquipements.push({ equipement: { connect: { id: equipements[2].id } }, quantite: 10 }); // ORDI x10
    }

    const salleExistant = await getPrisma().salle.findUnique({ where: { code } });
    if (salleExistant) {
      await getPrisma().salle.update({
        where: { code },
        data: {
          libelle: `Salle ${code}`,
          typeSalleId: typeSalleRef.id,
          siteId: siteRef.id,
          capacite,
        },
      });
    } else {
      await getPrisma().salle.create({
        data: {
          code,
          libelle: `Salle ${code}`,
          typeSalleId: typeSalleRef.id,
          siteId: siteRef.id,
          capacite,
          ...(liensEquipements.length > 0 && {
            salleEquipements: { create: liensEquipements },
          }),
        },
      });
    }
  }

  // ConfigSysteme (singleton) — paramètres par défaut (L04-05)
  await getOrCreate(
    () =>
      getPrisma().configSysteme.findUnique({
        where: { id: '00000000-0000-0000-0000-000000000920' },
      }),
    () =>
      getPrisma().configSysteme.create({
        data: {
          id: '00000000-0000-0000-0000-000000000920',
          pasDeTempsMinutes: 30,
          joursOuvres: '1,2,3,4,5,6',
          creneauxParJour: 24,
        },
      }),
    () =>
      getPrisma().configSysteme.update({
        where: { id: '00000000-0000-0000-0000-000000000920' },
        data: {},
      }),
  );

  // CreneauAffichage — variantes NORMAL et RAMADAN (L04-05)
  await getOrCreate(
    () => getPrisma().creneauAffichage.findUnique({ where: { variante: 'NORMAL' } }),
    () =>
      getPrisma().creneauAffichage.create({
        data: {
          variante: 'NORMAL',
          decalageMinutes: 0,
          plageReduiteMinutes: null,
          libelle: 'Grille horaire normale',
        },
      }),
    () =>
      getPrisma().creneauAffichage.update({
        where: { variante: 'NORMAL' },
        data: {},
      }),
  );
  await getOrCreate(
    () => getPrisma().creneauAffichage.findUnique({ where: { variante: 'RAMADAN' } }),
    () =>
      getPrisma().creneauAffichage.create({
        data: {
          variante: 'RAMADAN',
          decalageMinutes: 60,
          plageReduiteMinutes: 120,
          libelle: 'Grille horaire Ramadan (décalée +60 min, plage réduite 120 min)',
        },
      }),
    () =>
      getPrisma().creneauAffichage.update({
        where: { variante: 'RAMADAN' },
        data: {},
      }),
  );

  // Creneau — 144 créneaux (6 jours × 24 créneaux de 30 min, de 08:00 à 20:00) (L04-05)
  const HEURE_DEBUT_JOUR = 8; // 08:00
  for (let jour = 1; jour <= 6; jour++) {
    for (let ordre = 1; ordre <= 24; ordre++) {
      const minutesDepuisMinuit = HEURE_DEBUT_JOUR * 60 + (ordre - 1) * 30;
      const hDebut = Math.floor(minutesDepuisMinuit / 60);
      const mDebut = minutesDepuisMinuit % 60;
      const hFin = Math.floor((minutesDepuisMinuit + 30) / 60);
      const mFin = (minutesDepuisMinuit + 30) % 60;
      const dateRef = new Date(Date.UTC(2026, 0, 1));
      const heureDebut = new Date(Date.UTC(2026, 0, 1, hDebut, mDebut, 0, 0));
      const heureFin = new Date(Date.UTC(2026, 0, 1, hFin, mFin, 0, 0));

      const creneauExistant = await getPrisma().creneau.findUnique({
        where: { jour_ordre: { jour, ordre } },
      });
      if (creneauExistant) {
        await getPrisma().creneau.update({
          where: { jour_ordre: { jour, ordre } },
          data: {},
        });
      } else {
        await getPrisma().creneau.create({
          data: {
            jour,
            ordre,
            heureDebut,
            heureFin,
            dureeMinutes: 30,
          },
        });
      }
    }
  }

  console.log(
    `Seed de développement terminé. ${utilisateurs.length} comptes de démonstration créés/mis à jour.`,
  );
}

// Export pour les tests d'intégration
export { main };

// Exécution directe uniquement quand le fichier est lancé comme script principal
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
