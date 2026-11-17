-- TAKT-L06-07 — Rollback : suppression du modèle BailEdition

-- DropForeignKey
ALTER TABLE "BailEdition" DROP CONSTRAINT "BailEdition_utilisateurId_fkey";

-- DropForeignKey
ALTER TABLE "BailEdition" DROP CONSTRAINT "BailEdition_versionId_fkey";

-- DropIndex
DROP INDEX "BailEdition_utilisateurId_idx";

-- DropIndex
DROP INDEX "BailEdition_dateFin_idx";

-- DropIndex
DROP INDEX "BailEdition_versionId_key";

-- DropTable
DROP TABLE "BailEdition";
