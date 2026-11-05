-- DropForeignKey
ALTER TABLE "Groupe" DROP CONSTRAINT "Groupe_niveauId_fkey";

-- DropForeignKey
ALTER TABLE "Niveau" DROP CONSTRAINT "Niveau_parcoursId_fkey";

-- DropForeignKey
ALTER TABLE "Parcours" DROP CONSTRAINT "Parcours_departementId_fkey";

-- DropForeignKey
ALTER TABLE "Departement" DROP CONSTRAINT "Departement_etablissementId_fkey";

-- DropIndex
DROP INDEX "Groupe_niveauId_idx";

-- DropIndex
DROP INDEX "Groupe_code_idx";

-- DropIndex
DROP INDEX "Groupe_code_key";

-- DropIndex
DROP INDEX "Niveau_parcoursId_idx";

-- DropIndex
DROP INDEX "Niveau_code_idx";

-- DropIndex
DROP INDEX "Niveau_code_key";

-- DropIndex
DROP INDEX "Parcours_departementId_idx";

-- DropIndex
DROP INDEX "Parcours_code_idx";

-- DropIndex
DROP INDEX "Parcours_code_key";

-- DropIndex
DROP INDEX "Etablissement_code_idx";

-- DropIndex
DROP INDEX "Etablissement_code_key";

-- DropIndex
DROP INDEX "Departement_etablissementId_idx";

-- DropTable
DROP TABLE "Groupe";

-- DropTable
DROP TABLE "Niveau";

-- DropTable
DROP TABLE "Parcours";

-- DropTable
DROP TABLE "Etablissement";

-- AlterTable
ALTER TABLE "Departement" DROP COLUMN "etablissementId",
DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";