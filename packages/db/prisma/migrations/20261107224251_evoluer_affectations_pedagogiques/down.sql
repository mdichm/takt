-- TAKT-L05-02 — Rollback : retour à l'état antérieur d'AffectationPedagogique.
-- Suppression : versionId, typeEnseignementId, dureeCreneaux.
-- Renommage inverse : volumeHebdo → volumeHoraire.
-- enseignantId revient pointer vers Utilisateur.
-- matiereId et groupeId redeviennent des références logiques (pas de FK).
-- Suppression de la contrainte d'unicité.

-- 1. Suppression des contraintes et index
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_dureeCreneaux_positive";
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_volumeHebdo_positive";
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_versionId_enseignantId_matiereId_groupeId_key";
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_versionId_fkey";
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_typeEnseignementId_fkey";
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_groupeId_fkey";
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_matiereId_fkey";
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_enseignantId_fkey";

DROP INDEX "AffectationPedagogique_typeEnseignementId_idx";
DROP INDEX "AffectationPedagogique_groupeId_idx";
DROP INDEX "AffectationPedagogique_matiereId_idx";
DROP INDEX "AffectationPedagogique_versionId_idx";

-- 2. Restauration de l'ancienne FK enseignantId → Utilisateur
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Renommage inverse et suppression des colonnes
ALTER TABLE "AffectationPedagogique" RENAME COLUMN "volumeHebdo" TO "volumeHoraire";
ALTER TABLE "AffectationPedagogique" DROP COLUMN "dureeCreneaux";
ALTER TABLE "AffectationPedagogique" DROP COLUMN "typeEnseignementId";
ALTER TABLE "AffectationPedagogique" DROP COLUMN "versionId";