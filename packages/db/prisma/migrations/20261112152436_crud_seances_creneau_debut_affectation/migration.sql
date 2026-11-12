-- TAKT-L06-03 — CRUD des séances sur la grille hebdomadaire.
--
-- Évolution du modèle Seance :
--   * remplacement de creneauDebut (Int) par creneauDebutId (FK vers Creneau)
--   * ajout de affectationId (FK obligatoire vers AffectationPedagogique, ON DELETE CASCADE)
--   * ajout de matiereId et typeEnseignementId (FK optionnelles)
--   * ajout de relations Salle, Enseignant, Groupe, Matiere, TypeEnseignement
--   * remplacement de l'unicité (versionId, jour, creneauDebut, nbCreneaux)
--     par (versionId, jour, creneauDebutId)

-- 1. Ajout des nouvelles colonnes (nulles d'abord pour conserver les données existantes)
ALTER TABLE "Seance" ADD COLUMN "creneauDebutId" UUID;
ALTER TABLE "Seance" ADD COLUMN "affectationId" UUID;
ALTER TABLE "Seance" ADD COLUMN "matiereId" UUID;
ALTER TABLE "Seance" ADD COLUMN "typeEnseignementId" UUID;

-- 2. Suppression de l'ancien index unique
DROP INDEX IF EXISTS "Seance_versionId_jour_creneauDebut_nbCreneaux_key";

-- 3. Suppression de l'ancienne colonne creneauDebut
ALTER TABLE "Seance" DROP COLUMN "creneauDebut";

-- 4. Création du nouvel index unique (versionId, jour, creneauDebutId)
CREATE UNIQUE INDEX "Seance_versionId_jour_creneauDebutId_key"
  ON "Seance"("versionId", "jour", "creneauDebutId");

-- 5. Contraintes de clés étrangères
ALTER TABLE "Seance"
  ADD CONSTRAINT "Seance_creneauDebutId_fkey"
  FOREIGN KEY ("creneauDebutId") REFERENCES "Creneau"("id") ON DELETE RESTRICT;

ALTER TABLE "Seance"
  ADD CONSTRAINT "Seance_affectationId_fkey"
  FOREIGN KEY ("affectationId") REFERENCES "AffectationPedagogique"("id") ON DELETE CASCADE;

ALTER TABLE "Seance"
  ADD CONSTRAINT "Seance_salleId_fkey"
  FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE SET NULL;

ALTER TABLE "Seance"
  ADD CONSTRAINT "Seance_enseignantId_fkey"
  FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE SET NULL;

ALTER TABLE "Seance"
  ADD CONSTRAINT "Seance_groupeId_fkey"
  FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE SET NULL;

ALTER TABLE "Seance"
  ADD CONSTRAINT "Seance_matiereId_fkey"
  FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE SET NULL;

ALTER TABLE "Seance"
  ADD CONSTRAINT "Seance_typeEnseignementId_fkey"
  FOREIGN KEY ("typeEnseignementId") REFERENCES "TypeEnseignement"("id") ON DELETE SET NULL;