-- Rollback de 20261115000000_contraintes_unicite_seances_indices

DROP INDEX IF EXISTS "JournalAudit_horodatage_action_idx";
DROP INDEX IF EXISTS "Generation_versionId_statut_idx";
DROP INDEX IF EXISTS "Version_etat_idx";
DROP INDEX IF EXISTS "Seance_versionId_jour_creneauDebutId_groupeId_idx";
DROP INDEX IF EXISTS "Seance_versionId_jour_creneauDebutId_enseignantId_idx";
DROP INDEX IF EXISTS "Seance_versionId_jour_creneauDebutId_salleId_key";

CREATE UNIQUE INDEX "Seance_versionId_jour_creneauDebutId_key"
  ON "Seance" ("versionId", jour, "creneauDebutId");
