// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Fichier de setup global pour les tests d'intégration.
 *
 * Garantit l'isolation de la base de données entre chaque fichier de test
 * en tronquant toutes les tables avant l'exécution de chaque fichier.
 * Cela évite les fuites de données résiduels d'un test vers l'autre
 * quand tous les tests d'intégration partagent la même base PostgreSQL.
 */

import { creerPrismaClient } from '@takt/db';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/takt_test';
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
];

await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
await prisma.$executeRawUnsafe(
  `TRUNCATE TABLE "${TABLES.join('", "')}" CASCADE;`
);
await prisma.$executeRawUnsafe('SET session_replication_role = origin;');
await prisma.$disconnect();
