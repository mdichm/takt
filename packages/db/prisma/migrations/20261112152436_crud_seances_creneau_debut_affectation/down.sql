-- TAKT-L06-03 — Rollback : CRUD des séances sur la grille hebdomadaire.
--
-- Ordre inverse de la migration.

-- 1. Suppression des contraintes de clés étrangères
ALTER TABLE "Seance" DROP CONSTRAINT IF EXISTS "Seance_typeEnseignementId_fkey";
ALTER TABLE "Seance" DROP CONSTRAINT IF EXISTS "Seance_matiereId_fkey";
ALTER TABLE "Seance" DROP CONSTRAINT IF EXISTS "Seance_groupeId_fkey";
ALTER TABLE "Seance" DROP CONSTRAINT IF EXISTS "Seance_enseignantId_fkey";
ALTER TABLE "Seance" DROP CONSTRAINT IF EXISTS "Seance_salleId_fkey";
ALTER TABLE "Seance" DROP CONSTRAINT IF EXISTS "Seance_affectationId_fkey";
ALTER TABLE "Seance" DROP CONSTRAINT IF EXISTS "Seance_creneauDebutId_fkey";

-- 2. Suppression du nouvel index unique
DROP INDEX IF EXISTS "Seance_versionId_jour_creneauDebutId_key";

-- 3. Recréation de l'ancienne colonne creneauDebut (Int)
ALTER TABLE "Seance" ADD COLUMN "creneauDebut" INTEGER;

-- 4. Recréation de l'ancien index unique (versionId, jour, creneauDebut, nbCreneaux)
CREATE UNIQUE INDEX "Seance_versionId_jour_creneauDebut_nbCreneaux_key"
  ON "Seance"("versionId", "jour", "creneauDebut", "nbCreneaux");

-- 5. Suppression des nouvelles colonnes
ALTER TABLE "Seance" DROP COLUMN IF EXISTS "creneauDebutId";
ALTER TABLE "Seance" DROP COLUMN IF EXISTS "affectationId";
ALTER TABLE "Seance" DROP COLUMN IF EXISTS "matiereId";
ALTER TABLE "Seance" DROP COLUMN IF EXISTS "typeEnseignementId";

-- 6. Restauration de l'ancienne colonne activiteId (état antérieur, issue de la migration initiale)
ALTER TABLE "Seance" ADD COLUMN IF EXISTS "activiteId" UUID;