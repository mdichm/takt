-- TAKT-L06-08 — Verrous de séance : évolution du modèle VerrouSeance (versionId, valeur, poids, datePose, type énuméré)
-- Remplace la forme "bail temporaire" (heurePose / heureExpiration / type TEXT) par le modèle canonique.

-- CreateEnum
CREATE TYPE "TypeVerrou" AS ENUM ('CRENEAU', 'SALLE', 'ENSEIGNANT', 'ACTIVITE');

-- AlterTable
ALTER TABLE "VerrouSeance" ADD COLUMN "versionId" UUID NOT NULL;
ALTER TABLE "VerrouSeance" ALTER COLUMN "type" TYPE "TypeVerrou" USING "type"::"TypeVerrou";
ALTER TABLE "VerrouSeance" RENAME COLUMN "heurePose" TO "datePose";
ALTER TABLE "VerrouSeance" DROP COLUMN "heureExpiration";
ALTER TABLE "VerrouSeance" ADD COLUMN "valeur" UUID NOT NULL;
ALTER TABLE "VerrouSeance" ADD COLUMN "poids" INT NOT NULL DEFAULT 100;

-- DropForeignKey (ancienne FK seance, ON DELETE RESTRICT) puis recréation en CASCADE
ALTER TABLE "VerrouSeance" DROP CONSTRAINT "VerrouSeance_seanceId_fkey";
ALTER TABLE "VerrouSeance" ADD CONSTRAINT "VerrouSeance_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerrouSeance" ADD CONSTRAINT "VerrouSeance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Unique constraint : un seul verrou d'un type donne par seance
ALTER TABLE "VerrouSeance" ADD CONSTRAINT "VerrouSeance_seanceId_type_key" UNIQUE ("seanceId", "type");

-- Indexes
DROP INDEX IF EXISTS "VerrouSeance_heureExpiration_idx";
CREATE INDEX "VerrouSeance_versionId_idx" ON "VerrouSeance"("versionId");
CREATE INDEX "VerrouSeance_versionId_type_idx" ON "VerrouSeance"("versionId", "type");
