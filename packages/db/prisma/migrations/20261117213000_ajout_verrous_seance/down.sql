-- TAKT-L06-08 — Rollback : retour à la forme "bail temporaire" de VerrouSeance

-- DropIndex
DROP INDEX "VerrouSeance_versionId_type_idx";
DROP INDEX "VerrouSeance_versionId_idx";

-- Recréation de l'index heureExpiration
CREATE INDEX "VerrouSeance_heureExpiration_idx" ON "VerrouSeance"("heureExpiration");

-- Drop unique
ALTER TABLE "VerrouSeance" DROP CONSTRAINT "VerrouSeance_seanceId_type_key";

-- DropForeignKey version
ALTER TABLE "VerrouSeance" DROP CONSTRAINT "VerrouSeance_versionId_fkey";

-- Restauration FK seance en ON DELETE RESTRICT
ALTER TABLE "VerrouSeance" DROP CONSTRAINT "VerrouSeance_seanceId_fkey";
ALTER TABLE "VerrouSeance" ADD CONSTRAINT "VerrouSeance_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Colonnes supprimees / restaurees
ALTER TABLE "VerrouSeance" DROP COLUMN "versionId";
ALTER TABLE "VerrouSeance" DROP COLUMN "poids";
ALTER TABLE "VerrouSeance" DROP COLUMN "valeur";
ALTER TABLE "VerrouSeance" ADD COLUMN "heureExpiration" TIMESTAMP(3) NOT NULL;
ALTER TABLE "VerrouSeance" RENAME COLUMN "datePose" TO "heurePose";
ALTER TABLE "VerrouSeance" ALTER COLUMN "type" TYPE TEXT USING "type"::TEXT;

-- DropEnum
DROP TYPE "TypeVerrou";
