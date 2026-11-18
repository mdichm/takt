-- TAKT-L06-10 — Snapshot de version et immuabilité de la publication
-- -----------------------------------------------------------------
-- Ajoute le champ `type` sur Snapshot pour distinguer snapshots de
-- répartition (département) et snapshots de version (génération).
-- Complète Generation (FK snapshot, dureeMs, nombreScenarios) et
-- Scenario (placements JSONB) pour garantir la reproductibilité
-- d'une génération à partir de son snapshot (EX-DAT-01, EX-PRI-06).

-- 1. Colonne type sur Snapshot (valeur par défaut REPARTITION pour
--    préserver la compatibilité avec les snapshots de répartition existants)
ALTER TABLE "Snapshot" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'REPARTITION';

-- 2. Colonne snapshotId sur Generation + FK vers Snapshot
ALTER TABLE "Generation" ADD COLUMN "snapshotId" UUID;
ALTER TABLE "Generation"
  ADD CONSTRAINT "Generation_snapshotId_fkey"
    FOREIGN KEY ("snapshotId") REFERENCES "Snapshot"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Colonnes dureeMs et nombreScenarios sur Generation
ALTER TABLE "Generation" ADD COLUMN "dureeMs" INTEGER;
ALTER TABLE "Generation" ADD COLUMN "nombreScenarios" INTEGER NOT NULL DEFAULT 0;

-- 4. Colonne placements sur Scenario (valeur par défaut '{}')
ALTER TABLE "Scenario" ADD COLUMN "placements" JSONB NOT NULL DEFAULT '{}';

-- 5. Index sur Generation.snapshotId
CREATE INDEX "Generation_snapshotId_idx" ON "Generation"("snapshotId");
