-- Aligner ON DELETE CASCADE sur les FK Notification.utilisateur et EnseignantDepartement.*
-- (cohérence avec schema.prisma ; base locale était en RESTRICT, migrations déclaraient CASCADE)

-- 1. Notification_utilisateurId_fkey : RESTRICT -> CASCADE
ALTER TABLE "Notification"
  DROP CONSTRAINT "Notification_utilisateurId_fkey",
  ADD CONSTRAINT "Notification_utilisateurId_fkey"
    FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. EnseignantDepartement_enseignantId_fkey : RESTRICT -> CASCADE
ALTER TABLE "EnseignantDepartement"
  DROP CONSTRAINT "EnseignantDepartement_enseignantId_fkey",
  ADD CONSTRAINT "EnseignantDepartement_enseignantId_fkey"
    FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. EnseignantDepartement_departementId_fkey : RESTRICT -> CASCADE
ALTER TABLE "EnseignantDepartement"
  DROP CONSTRAINT "EnseignantDepartement_departementId_fkey",
  ADD CONSTRAINT "EnseignantDepartement_departementId_fkey"
    FOREIGN KEY ("departementId") REFERENCES "Departement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;