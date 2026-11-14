-- Rollback : CASCADE -> RESTRICT

-- 3. EnseignantDepartement_departementId_fkey : CASCADE -> RESTRICT
ALTER TABLE "EnseignantDepartement"
  DROP CONSTRAINT "EnseignantDepartement_departementId_fkey",
  ADD CONSTRAINT "EnseignantDepartement_departementId_fkey"
    FOREIGN KEY ("departementId") REFERENCES "Departement"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. EnseignantDepartement_enseignantId_fkey : CASCADE -> RESTRICT
ALTER TABLE "EnseignantDepartement"
  DROP CONSTRAINT "EnseignantDepartement_enseignantId_fkey",
  ADD CONSTRAINT "EnseignantDepartement_enseignantId_fkey"
    FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1. Notification_utilisateurId_fkey : CASCADE -> RESTRICT
ALTER TABLE "Notification"
  DROP CONSTRAINT "Notification_utilisateurId_fkey",
  ADD CONSTRAINT "Notification_utilisateurId_fkey"
    FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;