-- DropForeignKey
ALTER TABLE "public"."Utilisateur" DROP CONSTRAINT "Utilisateur_roleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Utilisateur" DROP CONSTRAINT "Utilisateur_departementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Semestre" DROP CONSTRAINT "Semestre_anneeUniversitaireId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Version" DROP CONSTRAINT "Version_semestreId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Snapshot" DROP CONSTRAINT "Snapshot_versionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_semestreId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_departementId_fkey";

-- DropForeignKey
ALTER TABLE "public"."AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_enseignantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Seance" DROP CONSTRAINT "Seance_versionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VerrouSeance" DROP CONSTRAINT "VerrouSeance_seanceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VerrouSeance" DROP CONSTRAINT "VerrouSeance_utilisateurId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Contrainte" DROP CONSTRAINT "Contrainte_versionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Generation" DROP CONSTRAINT "Generation_versionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Scenario" DROP CONSTRAINT "Scenario_generationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Export" DROP CONSTRAINT "Export_versionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."JournalAudit" DROP CONSTRAINT "JournalAudit_utilisateurId_fkey";

-- DropTable
DROP TABLE "public"."Utilisateur";

-- DropTable
DROP TABLE "public"."Role";

-- DropTable
DROP TABLE "public"."Departement";

-- DropTable
DROP TABLE "public"."AnneeUniversitaire";

-- DropTable
DROP TABLE "public"."Semestre";

-- DropTable
DROP TABLE "public"."Version";

-- DropTable
DROP TABLE "public"."Snapshot";

-- DropTable
DROP TABLE "public"."AffectationPedagogique";

-- DropTable
DROP TABLE "public"."Seance";

-- DropTable
DROP TABLE "public"."VerrouSeance";

-- DropTable
DROP TABLE "public"."Contrainte";

-- DropTable
DROP TABLE "public"."Generation";

-- DropTable
DROP TABLE "public"."Scenario";

-- DropTable
DROP TABLE "public"."Export";

-- DropTable
DROP TABLE "public"."JournalAudit";
