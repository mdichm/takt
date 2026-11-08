-- TAKT-L05-02 — Évolution du modèle AffectationPedagogique.
-- Ajout : versionId, typeEnseignementId, dureeCreneaux.
-- Renommage : volumeHoraire → volumeHebdo.
-- enseignantId pointe désormais vers Enseignant (au lieu de Utilisateur).
-- matiereId et groupeId deviennent de vraies FK.
-- Contrainte d'unicité du triplet (enseignant, matière, groupe) dans une version.

-- 1. Ajout des colonnes
ALTER TABLE "AffectationPedagogique" ADD COLUMN "versionId" UUID NOT NULL;
ALTER TABLE "AffectationPedagogique" ADD COLUMN "typeEnseignementId" UUID;
ALTER TABLE "AffectationPedagogique" ADD COLUMN "dureeCreneaux" INTEGER;
ALTER TABLE "AffectationPedagogique" RENAME COLUMN "volumeHoraire" TO "volumeHebdo";

-- 2. Clés étrangères (mise à jour + création)
-- 2a. enseignantId : Utilisateur → Enseignant
ALTER TABLE "AffectationPedagogique" DROP CONSTRAINT "AffectationPedagogique_enseignantId_fkey";
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2b. matiereId → Matiere
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2c. groupeId → Groupe
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2d. typeEnseignementId → TypeEnseignement
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_typeEnseignementId_fkey" FOREIGN KEY ("typeEnseignementId") REFERENCES "TypeEnseignement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2e. versionId → Version
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Contrainte d'unicité du triplet dans une version (ST_TAKT §2.3)
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_versionId_enseignantId_matiereId_groupeId_key" UNIQUE ("versionId", "enseignantId", "matiereId", "groupeId");

-- 4. Index (semestreId, departementId, enseignantId existent déjà depuis E0.5)
CREATE INDEX "AffectationPedagogique_versionId_idx" ON "AffectationPedagogique"("versionId");
CREATE INDEX "AffectationPedagogique_matiereId_idx" ON "AffectationPedagogique"("matiereId");
CREATE INDEX "AffectationPedagogique_groupeId_idx" ON "AffectationPedagogique"("groupeId");
CREATE INDEX "AffectationPedagogique_typeEnseignementId_idx" ON "AffectationPedagogique"("typeEnseignementId");

-- 5. Règles de domaine (volumes et durées strictement positifs)
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_volumeHebdo_positive" CHECK ("volumeHebdo" > 0);
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_dureeCreneaux_positive" CHECK ("dureeCreneaux" IS NULL OR "dureeCreneaux" > 0);