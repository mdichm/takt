-- DropForeignKey
ALTER TABLE "Matiere" DROP CONSTRAINT "Matiere_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "Module" DROP CONSTRAINT "Module_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Module" DROP CONSTRAINT "Module_typeEnseignementId_fkey";

-- DropForeignKey
ALTER TABLE "GradeTypeEnseignement" DROP CONSTRAINT "GradeTypeEnseignement_typeEnseignementId_fkey";

-- DropForeignKey
ALTER TABLE "GradeTypeEnseignement" DROP CONSTRAINT "GradeTypeEnseignement_gradeId_fkey";

-- DropIndex
DROP INDEX "ChargeRuleSet_code_idx";

-- DropIndex
DROP INDEX "ChargeRuleSet_code_key";

-- DropIndex
DROP INDEX "Matiere_moduleId_idx";

-- DropIndex
DROP INDEX "Matiere_code_idx";

-- DropIndex
DROP INDEX "Matiere_code_key";

-- DropIndex
DROP INDEX "Module_gradeId_idx";

-- DropIndex
DROP INDEX "Module_typeEnseignementId_idx";

-- DropIndex
DROP INDEX "Module_code_idx";

-- DropIndex
DROP INDEX "Module_code_key";

-- DropIndex
DROP INDEX "GradeTypeEnseignement_typeEnseignementId_idx";

-- DropIndex
DROP INDEX "GradeTypeEnseignement_gradeId_idx";

-- DropIndex
DROP INDEX "GradeTypeEnseignement_gradeId_typeEnseignementId_key";

-- DropIndex
DROP INDEX "Grade_code_idx";

-- DropIndex
DROP INDEX "Grade_code_key";

-- DropIndex
DROP INDEX "TypeEnseignement_code_idx";

-- DropIndex
DROP INDEX "TypeEnseignement_code_key";

-- DropTable
DROP TABLE "ChargeRuleSet";

-- DropTable
DROP TABLE "Matiere";

-- DropTable
DROP TABLE "Module";

-- DropTable
DROP TABLE "GradeTypeEnseignement";

-- DropTable
DROP TABLE "Grade";

-- DropTable
DROP TABLE "TypeEnseignement";