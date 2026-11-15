-- Migration: 20261115000000_contraintes_unicite_seances_indices
-- Objet : contraintes d'unicité SQL et index de performance sur la grille hebdomadaire
--  - UNIQUE (versionId, jour, creneauDebutId, salleId) sur Seance (HC-RES-01)
--  - index composites (enseignantId) et (groupeId) sur Seance (HC-RES-02, HC-RES-03 : détection métier)
--  - index Version.etat, Generation(versionId, statut), JournalAudit(horodatage, action) (ST_TAKT §2.4)

-- 1. Remplacer l'unicite existante (sans salleId) par l'unicite avec salleId
DROP INDEX IF EXISTS "Seance_versionId_jour_creneauDebutId_key";

CREATE UNIQUE INDEX "Seance_versionId_jour_creneauDebutId_salleId_key"
  ON "Seance" ("versionId", jour, "creneauDebutId", "salleId");

-- 2. Index composites de support pour la detection metier (enseignant, groupe)
CREATE INDEX "Seance_versionId_jour_creneauDebutId_enseignantId_idx"
  ON "Seance" ("versionId", jour, "creneauDebutId", "enseignantId");

CREATE INDEX "Seance_versionId_jour_creneauDebutId_groupeId_idx"
  ON "Seance" ("versionId", jour, "creneauDebutId", "groupeId");

-- 3. Index de performance demandes par ST_TAKT §2.4 / BACKLOG L06-04
CREATE INDEX "Version_etat_idx" ON "Version" ("etat");

CREATE INDEX "Generation_versionId_statut_idx" ON "Generation" ("versionId", "statut");

CREATE INDEX "JournalAudit_horodatage_action_idx" ON "JournalAudit" ("horodatage", "action");
