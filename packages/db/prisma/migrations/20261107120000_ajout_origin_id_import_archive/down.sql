-- DropIndex
DROP INDEX IF EXISTS "Parcours_originId_key";

-- DropIndex
DROP INDEX IF EXISTS "Groupe_originId_key";

-- DropIndex
DROP INDEX IF EXISTS "Module_originId_key";

-- DropIndex
DROP INDEX IF EXISTS "Matiere_originId_key";

-- DropIndex
DROP INDEX IF EXISTS "Salle_originId_key";

-- AlterTable
ALTER TABLE "Parcours" DROP COLUMN "originId";

-- AlterTable
ALTER TABLE "Groupe" DROP COLUMN "originId";

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "originId";

-- AlterTable
ALTER TABLE "Matiere" DROP COLUMN "originId";

-- AlterTable
ALTER TABLE "Salle" DROP COLUMN "originId";