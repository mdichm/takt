-- TAKT-L05-05 — Rollback : revalidation ciblée d’un département impacté.
--
-- Ordre inverse de la migration : suppression des tables qui référencent Snapshot
-- avant de supprimer les colonnes ajoutées sur Snapshot.

-- 1. Table Notification
DROP INDEX IF EXISTS "Notification_utilisateurId_lue_idx";
DROP INDEX IF EXISTS "Notification_utilisateurId_idx";
DROP TABLE IF EXISTS "Notification";

-- 2. Table ValidationRepartition (FK vers Snapshot, Version, Departement)
DROP INDEX IF EXISTS "ValidationRepartition_versionId_departementId_idx";
DROP INDEX IF EXISTS "ValidationRepartition_departementId_idx";
DROP INDEX IF EXISTS "ValidationRepartition_versionId_idx";
DROP TABLE IF EXISTS "ValidationRepartition";

-- 3. Restauration de l’index unique partiel (versionId, departementId) sur Snapshot
DROP INDEX IF EXISTS "Snapshot_versionId_departementId_courant_unique";
DROP INDEX IF EXISTS "Snapshot_versionId_departementId_revision_unique";

CREATE UNIQUE INDEX "Snapshot_versionId_departementId_repartition_unique"
  ON "Snapshot"("versionId", "departementId")
  WHERE "departementId" IS NOT NULL;

-- 4. Suppression des colonnes ajoutées sur Snapshot
ALTER TABLE "Snapshot" DROP COLUMN IF EXISTS "estCourant";
ALTER TABLE "Snapshot" DROP COLUMN IF EXISTS "revision";
