-- TAKT-L06-10 — Rollback : supprime les ajouts de snapshot/version et immuabilité

-- 5. Drop index Generation.snapshotId
DROP INDEX IF EXISTS "Generation_snapshotId_idx";

-- 4. Colonne placements sur Scenario
ALTER TABLE "Scenario" DROP COLUMN "placements";

-- 3. Colonnes dureeMs et nombreScenarios sur Generation
ALTER TABLE "Generation" DROP COLUMN "dureeMs";
ALTER TABLE "Generation" DROP COLUMN "nombreScenarios";

-- 2. Colonne snapshotId sur Generation + FK
ALTER TABLE "Generation" DROP CONSTRAINT IF EXISTS "Generation_snapshotId_fkey";
ALTER TABLE "Generation" DROP COLUMN "snapshotId";

-- 1. Colonne type sur Snapshot
ALTER TABLE "Snapshot" DROP COLUMN "type";
