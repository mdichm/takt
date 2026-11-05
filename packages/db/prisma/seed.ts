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
  instancePrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: resoudreConnexion() }) });
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
    { email: 'admin@takt.internal', nom: 'Admin', prenom: 'Système', role: 'admin', departement: 'INFO' },
    { email: 'gest@takt.internal', nom: 'Gestion', prenom: 'Temps', role: 'gest', departement: null },
    { email: 'rdep@takt.internal', nom: 'Resp', prenom: 'Département', role: 'rdep', departement: 'INFO' },
    { email: 'dir@takt.internal', nom: 'Direction', prenom: 'Établissement', role: 'dir', departement: null },
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
      create: { code: 'L-INFO', libelle: 'Licence Informatique', departementId: deptByCode.get('INFO')!.id },
    }),
    getPrisma().parcours.upsert({
      where: { code: 'L-MATH' },
      update: { libelle: 'Licence Mathématiques' },
      create: { code: 'L-MATH', libelle: 'Licence Mathématiques', departementId: deptByCode.get('MATH')!.id },
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
      create: { code: 'L3-MATH', libelle: 'Licence 3ème année Mathématiques', parcoursId: parcours[1].id },
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
