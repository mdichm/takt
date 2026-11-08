-- TAKT-L05-04 — Validation de la répartition pédagogique et snapshot immuable.
-- Ajout : departementId nullable sur Snapshot pour distinguer :
--   - snapshot de répartition (departementId NOT NULL) : un par (versionId, departementId)
--   - snapshot de publication (departementId NULL) : un par versionId (L06-10)
-- Index uniques partiels pour garantir l'unicité selon le cas.

-- 1. Ajout de la colonne departementId (nullable)
ALTER TABLE "Snapshot" ADD COLUMN "departementId" UUID;

-- 2. Suppression de l'ancien index unique sur versionId seul
DROP INDEX IF EXISTS "Snapshot_versionId_key";

-- 3. Index unique partiel : 1 snapshot de répartition par (versionId, departementId)
CREATE UNIQUE INDEX "Snapshot_versionId_departementId_repartition_unique"
  ON "Snapshot"("versionId", "departementId")
  WHERE "departementId" IS NOT NULL;

-- 4. Index unique partiel : 1 snapshot de publication par versionId (departementId = NULL)
CREATE UNIQUE INDEX "Snapshot_versionId_publication_unique"
  ON "Snapshot"("versionId")
  WHERE "departementId" IS NULL;

-- 5. Index pour les requêtes par departementId
CREATE INDEX "Snapshot_departementId_idx" ON "Snapshot"("departementId");