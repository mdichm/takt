-- DropForeignKey
ALTER TABLE "EnseignantDepartement" DROP CONSTRAINT "EnseignantDepartement_departementId_fkey";

-- DropForeignKey
ALTER TABLE "EnseignantDepartement" DROP CONSTRAINT "EnseignantDepartement_enseignantId_fkey";

-- DropForeignKey
ALTER TABLE "Enseignant" DROP CONSTRAINT "Enseignant_gradeId_fkey";

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'EnseignantDepartement' AND indexname = 'EnseignantDepartement_departementId_idx') THEN
    DROP INDEX "EnseignantDepartement_departementId_idx";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'EnseignantDepartement' AND indexname = 'EnseignantDepartement_enseignantId_idx') THEN
    DROP INDEX "EnseignantDepartement_enseignantId_idx";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Enseignant' AND indexname = 'Enseignant_prenom_idx') THEN
    DROP INDEX "Enseignant_prenom_idx";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Enseignant' AND indexname = 'Enseignant_nom_idx') THEN
    DROP INDEX "Enseignant_nom_idx";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Enseignant' AND indexname = 'Enseignant_gradeId_idx') THEN
    DROP INDEX "Enseignant_gradeId_idx";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Enseignant' AND indexname = 'Enseignant_email_idx') THEN
    DROP INDEX "Enseignant_email_idx";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Enseignant' AND indexname = 'Enseignant_email_key') THEN
    DROP INDEX "Enseignant_email_key";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Enseignant' AND indexname = 'Enseignant_matricule_idx') THEN
    DROP INDEX "Enseignant_matricule_idx";
END IF;

-- DropIndex
IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Enseignant' AND indexname = 'Enseignant_matricule_key') THEN
    DROP INDEX "Enseignant_matricule_key";
END IF;

-- DropTable
DROP TABLE "EnseignantDepartement";

-- DropTable
DROP TABLE "Enseignant";