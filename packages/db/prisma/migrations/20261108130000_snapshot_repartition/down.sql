-- TAKT-L05-04 — Rollback : suppression de departementId et restauration de l'index unique sur versionId.

-- 1. Suppression des index créés
DROP INDEX IF EXISTS "Snapshot_versionId_departementId_repartition_unique";
DROP INDEX IF EXISTS "Snapshot_versionId_publication_unique";
DROP INDEX IF EXISTS "Snapshot_departementId_idx";

-- 2. Restauration de l'index unique sur versionId seul
CREATE UNIQUE INDEX "Snapshot_versionId_key" ON "Snapshot"("versionId");

-- 3. Suppression de la colonne departementId
ALTER TABLE "Snapshot" DROP COLUMN IF EXISTS "departementId";