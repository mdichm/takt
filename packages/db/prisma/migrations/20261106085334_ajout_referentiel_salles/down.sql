-- DropForeignKey
ALTER TABLE "SalleEquipement" DROP CONSTRAINT IF EXISTS "SalleEquipement_equipementId_fkey";

-- DropForeignKey
ALTER TABLE "SalleEquipement" DROP CONSTRAINT IF EXISTS "SalleEquipement_salleId_fkey";

-- DropForeignKey
ALTER TABLE "Salle" DROP CONSTRAINT IF EXISTS "Salle_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Salle" DROP CONSTRAINT IF EXISTS "Salle_typeSalleId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "SalleEquipement_equipementId_idx";

-- DropIndex
DROP INDEX IF EXISTS "SalleEquipement_salleId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Salle_capacite_idx";

-- DropIndex
DROP INDEX IF EXISTS "Salle_siteId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Salle_typeSalleId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Salle_code_idx";

-- DropIndex
DROP INDEX IF EXISTS "Salle_code_key";

-- DropIndex
DROP INDEX IF EXISTS "Equipement_code_idx";

-- DropIndex
DROP INDEX IF EXISTS "Equipement_code_key";

-- DropIndex
DROP INDEX IF EXISTS "TypeSalle_code_idx";

-- DropIndex
DROP INDEX IF EXISTS "TypeSalle_code_key";

-- DropIndex
DROP INDEX IF EXISTS "Site_code_idx";

-- DropIndex
DROP INDEX IF EXISTS "Site_code_key";

-- DropTable
DROP TABLE "SalleEquipement";

-- DropTable
DROP TABLE "Salle";

-- DropTable
DROP TABLE "Equipement";

-- DropTable
DROP TABLE "TypeSalle";

-- DropTable
DROP TABLE "Site";