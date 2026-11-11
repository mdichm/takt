// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Fichier de setup global pour les tests d'intégration de @takt/db.
 *
 * Garantit l'isolation de la base de données entre chaque fichier de test
 * en tronquant toutes les tables avant l'exécution de chaque fichier.
 */

import { creerPrismaClient } from '../src/index';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/takt_test';
// Injecter dans process.env pour que @takt/db/prisma/seed.ts resoudreConnexion()
// lise DATABASE_URL depuis l'environnement (ce fichier tronque la même base de test).
process.env.DATABASE_URL = DATABASE_URL;
const prisma = creerPrismaClient(DATABASE_URL);

// Ordre des tables à tronquer : les tables dépendantes d'abord,
// puis les tables référencées, pour respecter les contraintes FK.
// session_replication_role = replica désactive temporairement les FK.
const TABLES = [
  'Scenario',
  'Generation',
  'Export',
  'AffectationPedagogique',
  'Seance',
  'VerrouSeance',
  'Contrainte',
  'Snapshot',
  'JournalAudit',
  'SessionRefresh',
  'Notification',
  'Utilisateur',
  'Role',
  'Departement',
  'Semestre',
  'AnneeUniversitaire',
  'Version',
  'Matiere',
  'Module',
  'GradeTypeEnseignement',
  'Grade',
  'TypeEnseignement',
  'EnseignantDepartement',
  'Enseignant',
  'SalleEquipement',
  'Salle',
  'Equipement',
  'TypeSalle',
  'Site',
];

await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${TABLES.join('", "')}" CASCADE;`);
await prisma.$executeRawUnsafe('SET session_replication_role = origin;');
await prisma.$disconnect();
