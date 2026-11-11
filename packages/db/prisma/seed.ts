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
      getPrisma().role.upsert({
        where: { code },
        update: { libelle },
        create: { code, libelle },
      }),
    ),
  );

  const etablissement = await getPrisma().etablissement.upsert({
    where: { code: 'TAKT' },
    update: { libelle: 'Université de Takt' },
    create: { code: 'TAKT', libelle: 'Université de Takt' },
  });

  const departements = await Promise.all(
    [
      ['INFO', 'Informatique'],
      ['MATH', 'Mathématiques'],
      ['PHYS', 'Physique'],
    ].map(([code, libelle]) =>
      getPrisma().departement.upsert({
        where: { code },
        update: { libelle },
        create: { code, libelle, etablissementId: etablissement.id },
      }),
    ),
  );

  const annee = await getPrisma().anneeUniversitaire.upsert({
    where: { libelle: '2026-2027' },
    update: {},
    create: {
      libelle: '2026-2027',
      dateDebut: new Date('2026-09-01T00:00:00.000Z'),
      dateFin: new Date('2027-08-31T00:00:00.000Z'),
    },
  });

  for (const numero of [1, 2]) {
    await getPrisma().semestre.upsert({
      where: { anneeUniversitaireId_numero: { anneeUniversitaireId: annee.id, numero } },
      update: {},
      create: {
        numero,
        anneeUniversitaireId: annee.id,
        dateDebut: new Date(numero === 1 ? '2026-10-01' : '2027-02-01'),
        dateFin: new Date(numero === 1 ? '2027-01-31' : '2027-06-30'),
      },
    });
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

    await getPrisma().utilisateur.upsert({
      where: { email: u.email },
      update: {
        motDePasseHash,
        nom: u.nom,
        prenom: u.prenom,
        roleId: role.id,
        departementId: departement?.id ?? null,
        estActif: true,
      },
      create: {
        email: u.email,
        nom: u.nom,
        prenom: u.prenom,
        roleId: role.id,
        departementId: departement?.id ?? null,
        estActif: true,
        motDePasseHash,
      },
    });
  }

  // Parcours de référence liés aux départements
  const parcours = await Promise.all([
    getPrisma().parcours.upsert({
      where: { code: 'L-INFO' },
      update: { libelle: 'Licence Informatique' },
      create: {
        code: 'L-INFO',
        libelle: 'Licence Informatique',
        departementId: deptByCode.get('INFO')!.id,
      },
    }),
    getPrisma().parcours.upsert({
      where: { code: 'L-MATH' },
      update: { libelle: 'Licence Mathématiques' },
      create: {
        code: 'L-MATH',
        libelle: 'Licence Mathématiques',
        departementId: deptByCode.get('MATH')!.id,
      },
    }),
  ]);

  // Niveaux de référence
  const niveaux = await Promise.all([
    getPrisma().niveau.upsert({
      where: { code: 'L1' },
      update: { libelle: 'Licence 1ère année' },
      create: { code: 'L1', libelle: 'Licence 1ère année', parcoursId: parcours[0].id },
    }),
    getPrisma().niveau.upsert({
      where: { code: 'L2' },
      update: { libelle: 'Licence 2ème année' },
      create: { code: 'L2', libelle: 'Licence 2ème année', parcoursId: parcours[0].id },
    }),
    getPrisma().niveau.upsert({
      where: { code: 'L3-MATH' },
      update: { libelle: 'Licence 3ème année Mathématiques' },
      create: {
        code: 'L3-MATH',
        libelle: 'Licence 3ème année Mathématiques',
        parcoursId: parcours[1].id,
      },
    }),
  ]);

  // Groupes de référence
  await Promise.all([
    getPrisma().groupe.upsert({
      where: { code: 'TD1-A' },
      update: { libelle: 'TD Groupe A L1' },
      create: { code: 'TD1-A', libelle: 'TD Groupe A L1', niveauId: niveaux[0].id },
    }),
    getPrisma().groupe.upsert({
      where: { code: 'TD1-B' },
      update: { libelle: 'TD Groupe B L1' },
      create: { code: 'TD1-B', libelle: 'TD Groupe B L1', niveauId: niveaux[0].id },
    }),
    getPrisma().groupe.upsert({
      where: { code: 'TP1-A' },
      update: { libelle: 'TP Groupe A L1' },
      create: { code: 'TP1-A', libelle: 'TP Groupe A L1', niveauId: niveaux[0].id },
    }),
  ]);
  // Types d’enseignement de référence\n  const types = await Promise.all([\n    getPrisma().typeEnseignement.upsert({\n      where: { code: 'CM' },\n      update: { libelle: 'Cours magistral', couleur: '#3B82F6' },\n      create: { code: 'CM', libelle: 'Cours magistral', couleur: '#3B82F6' },\n    }),\n    getPrisma().typeEnseignement.upsert({\n      where: { code: 'TD' },\n      update: { libelle: 'Travaux dirigés', couleur: '#10B981' },\n      create: { code: 'TD', libelle: 'Travaux dirigés', couleur: '#10B981' },\n    }),\n    getPrisma().typeEnseignement.upsert({\n      where: { code: 'TP' },\n      update: { libelle: 'Travaux pratiques', couleur: '#F59E0B' },\n      create: { code: 'TP', libelle: 'Travaux pratiques', couleur: '#F59E0B' },\n    }),\n    getPrisma().typeEnseignement.upsert({\n      where: { code: 'PROJET' },\n      update: { libelle: 'Projet tutoré', couleur: '#8B5CF6' },\n      create: { code: 'PROJET', libelle: 'Projet tutoré', couleur: '#8B5CF6' },\n    }),\n  ]);\n\n  // Grades de référence\n  const grades = await Promise.all([\n    getPrisma().grade.upsert({\n      where: { code: 'L1' },\n      update: { libelle: 'Licence 1ère année' },\n      create: { code: 'L1', libelle: 'Licence 1ère année' },\n    }),\n    getPrisma().grade.upsert({\n      where: { code: 'L2' },\n      update: { libelle: 'Licence 2ème année' },\n      create: { code: 'L2', libelle: 'Licence 2ème année' },\n    }),\n    getPrisma().grade.upsert({\n      where: { code: 'L3' },\n      update: { libelle: 'Licence 3ème année' },\n      create: { code: 'L3', libelle: 'Licence 3ème année' },\n    }),\n    getPrisma().grade.upsert({\n      where: { code: 'M1' },\n      update: { libelle: 'Master 1ère année' },\n      create: { code: 'M1', libelle: 'Master 1ère année' },\n    }),\n    getPrisma().grade.upsert({\n      where: { code: 'M2' },\n      update: { libelle: 'Master 2ème année' },\n      create: { code: 'M2', libelle: 'Master 2ème année' },\n    }),\n  ]);\n\n  // Matrice Grade × Type (4 types × 5 grades = 20 couples)\n  for (const grade of grades) {\n    for (const type of types) {\n      await getPrisma().gradeTypeEnseignement.upsert({\n        where: {\n          gradeId_typeEnseignementId: {\n            gradeId: grade.id,\n            typeEnseignementId: type.id,\n          },\n        },\n        update: {},\n        create: {\n          gradeId: grade.id,\n          typeEnseignementId: type.id,\n        },\n      });\n    }\n  }\n\n

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
      await getPrisma().site.upsert({ where: { code }, update: { libelle }, create: { code, libelle } }),
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
      await getPrisma().typeSalle.upsert({ where: { code }, update: { libelle }, create: { code, libelle } }),
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
      await getPrisma().equipement.upsert({ where: { code }, update: { libelle }, create: { code, libelle } }),
    );
  }

  // 150 salles (SALLE-001 à SALLE-150), réparties sur 3 sites et 4 types
  for (let i = 1; i <= 150; i++) {
    const code = `SALLE-${String(i).padStart(3, '0')}`;
    const site = sites[(i - 1) % 3];
    const typeSalle = typesSalle[(i - 1) % 4];
    const capacite =
      typeSalle.code === 'CM'
        ? 120
        : typeSalle.code === 'TD'
          ? 30
          : typeSalle.code === 'TP'
            ? 24
            : 20;

    // Préparer les liens équipements selon le type de salle
    const liensEquipements = [];
    if (typeSalle.code === 'CM' || typeSalle.code === 'TD') {
      liensEquipements.push({ equipement: { connect: { id: equipements[0].id } }, quantite: 1 }); // VIDEOPRJ
      liensEquipements.push({ equipement: { connect: { id: equipements[1].id } }, quantite: 1 }); // TABLEAU
      liensEquipements.push({ equipement: { connect: { id: equipements[2].id } }, quantite: 1 }); // ORDI
    }
    if (typeSalle.code === 'TP' || typeSalle.code === 'INFO') {
      liensEquipements.push({ equipement: { connect: { id: equipements[2].id } }, quantite: 10 }); // ORDI x10
    }

    const salleExistant = await getPrisma().salle.findUnique({ where: { code } });
    if (salleExistant) {
      await getPrisma().salle.update({
        where: { code },
        data: {
          libelle: `Salle ${code}`,
          typeSalleId: typeSalle.id,
          siteId: site.id,
          capacite,
        },
      });
    } else {
      await getPrisma().salle.create({
        data: {
          code,
          libelle: `Salle ${code}`,
          typeSalleId: typeSalle.id,
          siteId: site.id,
          capacite,
          ...(liensEquipements.length > 0 && {
            salleEquipements: { create: liensEquipements },
          }),
        },
      });
    }
  }

  // ConfigSysteme (singleton) — paramètres par défaut (L04-05)
  await getPrisma().configSysteme.upsert({
    where: { id: '00000000-0000-0000-0000-000000000920' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000920',
      pasDeTempsMinutes: 30,
      joursOuvres: '1,2,3,4,5,6',
      creneauxParJour: 24,
    },
  });

  // CreneauAffichage — variantes NORMAL et RAMADAN (L04-05)
  await getPrisma().creneauAffichage.upsert({
    where: { variante: 'NORMAL' },
    update: {},
    create: {
      variante: 'NORMAL',
      decalageMinutes: 0,
      plageReduiteMinutes: null,
      libelle: 'Grille horaire normale',
    },
  });
  await getPrisma().creneauAffichage.upsert({
    where: { variante: 'RAMADAN' },
    update: {},
    create: {
      variante: 'RAMADAN',
      decalageMinutes: 60,
      plageReduiteMinutes: 120,
      libelle: 'Grille horaire Ramadan (décalée +60 min, plage réduite 120 min)',
    },
  });

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
