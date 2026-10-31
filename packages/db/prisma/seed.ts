// ============================================================================
// TAKT — Seed de base de données (développement)
// Fichier : packages/db/prisma/seed.ts
// Étape : G1 — Stratégie de migration
// ============================================================================

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seed de développement...');

  // ------------------------------------------------------------
  // 1. Rôles (référentiel immuable)
  // ------------------------------------------------------------
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: { code: 'admin', libelle: 'Administrateur' },
    }),
    prisma.role.upsert({
      where: { code: 'gest' },
      update: {},
      create: { code: 'gest', libelle: 'Gestionnaire des emplois du temps' },
    }),
    prisma.role.upsert({
      where: { code: 'rdep' },
      update: {},
      create: { code: 'rdep', libelle: 'Responsable de département' },
    }),
    prisma.role.upsert({
      where: { code: 'dir' },
      update: {},
      create: { code: 'dir', libelle: 'Direction' },
    }),
  ]);

  const roleMap = Object.fromEntries(roles.map(r => [r.code, r.id]));
  console.log('✅ Rôles créés');
// ------------------------------------------------------------
// 2. Départements
// ------------------------------------------------------------
const departements = await Promise.all([
  prisma.departement.upsert({
    where: { code: 'INFO' },
    update: {},
    create: { code: 'INFO', libelle: 'Informatique' },
  }),
  prisma.departement.upsert({
    where: { code: 'MATH' },
    update: {},
    create: { code: 'MATH', libelle: 'Mathématiques' },
  }),
  prisma.departement.upsert({
    where: { code: 'PHYS' },
    update: {},
    create: { code: 'PHYS', libelle: 'Physique' },
  }),
]);

const depMap = Object.fromEntries(departements.map(d => [d.code, d.id]));
console.log('✅ Départements créés');

// ------------------------------------------------------------
// 3. Utilisateurs (1 par rôle)
// ------------------------------------------------------------
const hashedPassword = await argon2.hash('Password123!', {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

const users = await Promise.all([
  prisma.utilisateur.upsert({
    where: { email: 'admin@takt.internal' },
    update: {},
    create: {
      email: 'admin@takt.internal',
      nom: 'Admin',
      prenom: 'System',
      roleId: roleMap.admin,
      departementId: null,
      estActif: true,
      motDePasseHash: hashedPassword,
    },
  }),
  prisma.utilisateur.upsert({
    where: { email: 'gest@takt.internal' },
    update: {},
    create: {
      email: 'gest@takt.internal',
      nom: 'Gestion',
      prenom: 'Emplois',
      roleId: roleMap.gest,
      departementId: null,
      estActif: true,
      motDePasseHash: hashedPassword,
    },
  }),
  prisma.utilisateur.upsert({
    where: { email: 'rdep.info@takt.internal' },
    update: {},
    create: {
      email: 'rdep.info@takt.internal',
      nom: 'Dupont',
      prenom: 'Marie',
      roleId: roleMap.rdep,
      departementId: depMap.INFO,
      estActif: true,
      motDePasseHash: hashedPassword,
    },
  }),
  prisma.utilisateur.upsert({
    where: { email: 'dir@takt.internal' },
    update: {},
    create: {
      email: 'dir@takt.internal',
      nom: 'Directeur',
      prenom: 'General',
      roleId: roleMap.dir,
      departementId: null,
      estActif: true,
      motDePasseHash: hashedPassword,
    },
  }),
]);

console.log('✅ Utilisateurs créés');

// ------------------------------------------------------------
// 4. Année universitaire et semestres
// ------------------------------------------------------------
const annee = await prisma.anneeUniversitaire.upsert({
  where: { libelle: '2026-2027' },
  update: {},
  create: {
    libelle: '2026-2027',
    dateDebut: new Date('2026-09-01'),
    dateFin: new Date('2027-06-30'),
  },
});

const semestres = await Promise.all([
  prisma.semestre.upsert({
    where: { id: 'semestre-s1-2026-2027' },
    update: {},
    create: {
      numero: 1,
      anneeUniversitaireId: annee.id,
      dateDebut: new Date('2026-09-01'),
      dateFin: new Date('2027-01-31'),
    },
  }),
  prisma.semestre.upsert({
    where: { id: 'semestre-s2-2026-2027' },
    update: {},
    create: {
      numero: 2,
      anneeUniversitaireId: annee.id,
      dateDebut: new Date('2027-02-01'),
      dateFin: new Date('2027-06-30'),
    },
  }),
]);

console.log('✅ Année universitaire et semestres créés');
// ------------------------------------------------------------
// 5. Référentiels minimaux (salles, enseignants, matières, groupes)
// ------------------------------------------------------------
const salles = await Promise.all(
  ['A101', 'A102', 'B201', 'B202', 'AMPHI'].map((code, i) =>
    prisma.salle.upsert({
      where: { code },
      update: {},
      create: {
        code,
        libelle: `Salle ${code}`,
        capacite: code.startsWith('AMPHI') ? 200 : 30,
        type: code.startsWith('AMPHI') ? 'AMPHI' : 'TD',
        batiment: code[0],
      },
    })
  )
);

const enseignants = await Promise.all(
  ['MARTIN', 'DUBOIS', 'BERNARD', 'MOREAU', 'LAURENT', 'SIMON', 'MICHEL', 'LEFEBVRE', 'GARCIA', 'ROUX'].map((nom, i) =>
    prisma.enseignant.upsert({
      where: { email: `${nom.toLowerCase()}@etab.internal` },
      update: {},
      create: {
        email: `${nom.toLowerCase()}@etab.internal`,
        nom,
        prenom: `Prenom${i + 1}`,
        grade: 'MCF',
        departementId: depMap[Object.keys(depMap)[i % 3]],
        estActif: true,
      },
    })
  )
);

const matieres = await Promise.all(
  ['ALGO', 'BD', 'WEB', 'RESEAU', 'SECURITE'].map((code, i) =>
    prisma.matiere.upsert({
      where: { code },
      update: {},
      create: {
        code,
        libelle: `${code} - ${['Algorithmique', 'Bases de données', 'Développement Web', 'Réseaux', 'Sécurité'][i]}`,
        typeEnseignement: 'CM',
        coefficientCharge: 1.0,
        departementId: depMap.INFO,
      },
    })
  )
);

const groupes = await Promise.all(
  ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].map((code) =>
    prisma.groupe.upsert({
      where: { code },
      update: {},
      create: {
        code,
        libelle: `Groupe ${code}`,
        effectif: 25 + Math.floor(Math.random() * 10),
        departementId: depMap.INFO,
      },
    })
  )
);

console.log('✅ Référentiels minimaux créés');

// ------------------------------------------------------------
// 6. Version initiale (état "initial")
// ------------------------------------------------------------
const semestreS1 = semestres[0];

const versionInitiale = await prisma.version.upsert({
  where: { id: 'version-initiale-s1-2026-2027' },
  update: {},
  create: {
    id: 'version-initiale-s1-2026-2027',
    semestreId: semestreS1.id,
    etat: 'initial',
    numero: 1,
    label: 'Version initiale S1 2026-2027',
    createdById: users[0].id, // admin
  },
});

console.log('✅ Version initiale créée');

// ------------------------------------------------------------
// 7. Paramètres système (Configuration)
// ------------------------------------------------------------
await prisma.configuration.upsert({
  where: { cle: 'pas_temps_minutes' },
  update: {},
  create: { cle: 'pas_temps_minutes', valeur: '30', description: 'Pas de temps en minutes (fixe institution)' },
});

await prisma.configuration.upsert({
  where: { cle: 'jours_ouvres' },
  update: {},
  create: { cle: 'jours_ouvres', valeur: '1,2,3,4,5,6', description: 'Jours ouvrés (1=lundi, 6=samedi)' },
});

await prisma.configuration.upsert({
  where: { cle: 'seuil_verrouillage_risque_pct' },
  update: {},
  create: { cle: 'seuil_verrouillage_risque_pct', valeur: '75', description: 'Seuil % verrouillage avant avertissement génération' },
});

await prisma.configuration.upsert({
  where: { cle: 'bail_edition_duree_minutes' },
  update: {},
  create: { cle: 'bail_edition_duree_minutes', valeur: '30', description: 'Durée du bail d\'édition en minutes' },
});

// ------------------------------------------------------------
// 8. Poids par défaut des contraintes SOFT (SPEC_CONTRAINTES_GENERATION.md §8.1)
// ------------------------------------------------------------
const softConstraintDefaults = [
  // Préférences enseignants
  { cle: 'soft_TEACHER_PREFERRED_SLOTS', valeur: '30', description: 'Poids défaut: créneaux préférés enseignant' },
  { cle: 'soft_TEACHER_AVOIDED_SLOTS', valeur: '20', description: 'Poids défaut: créneaux évités enseignant' },
  { cle: 'soft_TEACHER_PREFERRED_DAYS', valeur: '25', description: 'Poids défaut: jours préférés enseignant' },
  { cle: 'soft_TEACHER_PREFERRED_ROOM', valeur: '15', description: 'Poids défaut: salle préférée enseignant' },

  // Continuité
  { cle: 'soft_CONSECUTIVE_SLOTS', valeur: '40', description: 'Poids défaut: séances consécutives' },
  { cle: 'soft_NO_GAPS_GROUPS', valeur: '35', description: 'Poids défaut: pas de trous groupes' },
  { cle: 'soft_NO_GAPS_TEACHERS', valeur: '30', description: 'Poids défaut: pas de trous enseignants' },
  { cle: 'soft_COMPACT_DAYS', valeur: '25', description: 'Poids défaut: journées compactes' },
  { cle: 'soft_FREE_HALF_DAYS', valeur: '20', description: 'Poids défaut: demi-journées libres' },

  // Charge
  { cle: 'soft_MAX_HOURS_PER_DAY', valeur: '50', description: 'Poids défaut: max heures/jour' },
  { cle: 'soft_MAX_HOURS_PER_WEEK', valeur: '60', description: 'Poids défaut: max heures/semaine' },
  { cle: 'soft_LOAD_BALANCE', valeur: '30', description: 'Poids défaut: équilibrage charge' },
  { cle: 'soft_WINDOW_CONSTRAINT', valeur: '40', description: 'Poids défaut: fenêtre horaire' },

  // Pédagogique
  { cle: 'soft_SUBJECT_GROUPING', valeur: '25', description: 'Poids défaut: regroupement matière' },
  { cle: 'soft_CM_BEFORE_TD', valeur: '30', description: 'Poids défaut: CM avant TD' },
  { cle: 'soft_SPREAD', valeur: '20', description: 'Poids défaut: étalement semaine' },
  { cle: 'soft_AVOID_LAST_SLOT', valeur: '15', description: 'Poids défaut: éviter dernier créneau' },

  // Salles
  { cle: 'soft_SAME_ROOM', valeur: '25', description: 'Poids défaut: même salle activité' },
  { cle: 'soft_ROOM_PROXIMITY', valeur: '20', description: 'Poids défaut: proximité salles' },
  { cle: 'soft_PREFERRED_BUILDING', valeur: '15', description: 'Poids défaut: bâtiment préféré' },

  // Génération
  { cle: 'generation_max_scenarios', valeur: '3', description: 'Nombre max scénarios générés' },
  { cle: 'generation_time_limit_seconds', valeur: '300', description: 'Timeout solver en secondes' },
  { cle: 'generation_max_memory_gb', valeur: '4', description: 'Limite mémoire solver en GB' },
];

await Promise.all(
  softConstraintDefaults.map(cfg =>
    prisma.configuration.upsert({
      where: { cle: cfg.cle },
      update: {},
      create: cfg,
    })
  )
);

console.log('✅ Paramètres système créés');

console.log('🎉 Seed de développement terminé avec succès !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });