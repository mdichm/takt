-- TAKT-L05-01 — Rollback : suppression des tables PlanEtudesMatiere et PlanEtudes.

-- DropForeignKey
ALTER TABLE "PlanEtudesMatiere" DROP CONSTRAINT "PlanEtudesMatiere_typeEnseignementId_fkey";
ALTER TABLE "PlanEtudesMatiere" DROP CONSTRAINT "PlanEtudesMatiere_matiereId_fkey";
ALTER TABLE "PlanEtudesMatiere" DROP CONSTRAINT "PlanEtudesMatiere_planEtudesId_fkey";
ALTER TABLE "PlanEtudes" DROP CONSTRAINT "PlanEtudes_departementId_fkey";
ALTER TABLE "PlanEtudes" DROP CONSTRAINT "PlanEtudes_semestreId_fkey";
ALTER TABLE "PlanEtudes" DROP CONSTRAINT "PlanEtudes_anneeUniversitaireId_fkey";
ALTER TABLE "PlanEtudes" DROP CONSTRAINT "PlanEtudes_niveauId_fkey";
ALTER TABLE "PlanEtudes" DROP CONSTRAINT "PlanEtudes_parcoursId_fkey";

-- DropCheck
ALTER TABLE "PlanEtudesMatiere" DROP CONSTRAINT "PlanEtudesMatiere_coefficient_positive";
ALTER TABLE "PlanEtudesMatiere" DROP CONSTRAINT "PlanEtudesMatiere_dureeCreneaux_positive";
ALTER TABLE "PlanEtudesMatiere" DROP CONSTRAINT "PlanEtudesMatiere_volumeHoraire_positive";

-- DropIndex
DROP INDEX "PlanEtudesMatiere_planEtudesId_matiereId_key";
DROP INDEX "PlanEtudesMatiere_typeEnseignementId_idx";
DROP INDEX "PlanEtudesMatiere_matiereId_idx";
DROP INDEX "PlanEtudesMatiere_planEtudesId_idx";
DROP INDEX "PlanEtudes_niveauId_anneeUniversitaireId_semestreId_key";
DROP INDEX "PlanEtudes_departementId_idx";
DROP INDEX "PlanEtudes_semestreId_idx";
DROP INDEX "PlanEtudes_anneeUniversitaireId_idx";
DROP INDEX "PlanEtudes_niveauId_idx";
DROP INDEX "PlanEtudes_parcoursId_idx";

-- DropTable
DROP TABLE "PlanEtudesMatiere";
DROP TABLE "PlanEtudes";