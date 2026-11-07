/*
  TAKT-L05-01 — Création des tables PlanEtudes et PlanEtudesMatiere.
  Le plan d'études appartient à un niveau ; un groupe hérite du plan de son niveau.
  Aucune FK directe Groupe.planEtudesId n'est créée.
*/

-- CreateTable
CREATE TABLE "PlanEtudes" (
    "id" UUID NOT NULL,
    "parcoursId" UUID NOT NULL,
    "niveauId" UUID NOT NULL,
    "anneeUniversitaireId" UUID NOT NULL,
    "semestreId" UUID NOT NULL,
    "departementId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanEtudes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEtudesMatiere" (
    "id" UUID NOT NULL,
    "planEtudesId" UUID NOT NULL,
    "matiereId" UUID NOT NULL,
    "typeEnseignementId" UUID NOT NULL,
    "volumeHoraire" INTEGER NOT NULL,
    "dureeCreneaux" INTEGER NOT NULL,
    "coefficient" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanEtudesMatiere_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanEtudes_parcoursId_idx" ON "PlanEtudes"("parcoursId");
CREATE INDEX "PlanEtudes_niveauId_idx" ON "PlanEtudes"("niveauId");
CREATE INDEX "PlanEtudes_anneeUniversitaireId_idx" ON "PlanEtudes"("anneeUniversitaireId");
CREATE INDEX "PlanEtudes_semestreId_idx" ON "PlanEtudes"("semestreId");
CREATE INDEX "PlanEtudes_departementId_idx" ON "PlanEtudes"("departementId");
CREATE UNIQUE INDEX "PlanEtudes_niveauId_anneeUniversitaireId_semestreId_key" ON "PlanEtudes"("niveauId", "anneeUniversitaireId", "semestreId");

-- CreateIndex
CREATE INDEX "PlanEtudesMatiere_planEtudesId_idx" ON "PlanEtudesMatiere"("planEtudesId");
CREATE INDEX "PlanEtudesMatiere_matiereId_idx" ON "PlanEtudesMatiere"("matiereId");
CREATE INDEX "PlanEtudesMatiere_typeEnseignementId_idx" ON "PlanEtudesMatiere"("typeEnseignementId");
CREATE UNIQUE INDEX "PlanEtudesMatiere_planEtudesId_matiereId_key" ON "PlanEtudesMatiere"("planEtudesId", "matiereId");

-- AddForeignKey
ALTER TABLE "PlanEtudes" ADD CONSTRAINT "PlanEtudes_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEtudes" ADD CONSTRAINT "PlanEtudes_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES "Niveau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEtudes" ADD CONSTRAINT "PlanEtudes_anneeUniversitaireId_fkey" FOREIGN KEY ("anneeUniversitaireId") REFERENCES "AnneeUniversitaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEtudes" ADD CONSTRAINT "PlanEtudes_semestreId_fkey" FOREIGN KEY ("semestreId") REFERENCES "Semestre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEtudes" ADD CONSTRAINT "PlanEtudes_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlanEtudesMatiere" ADD CONSTRAINT "PlanEtudesMatiere_planEtudesId_fkey" FOREIGN KEY ("planEtudesId") REFERENCES "PlanEtudes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEtudesMatiere" ADD CONSTRAINT "PlanEtudesMatiere_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "Matiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEtudesMatiere" ADD CONSTRAINT "PlanEtudesMatiere_typeEnseignementId_fkey" FOREIGN KEY ("typeEnseignementId") REFERENCES "TypeEnseignement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Règles de domaine (volumes et durées strictement positifs)
ALTER TABLE "PlanEtudesMatiere" ADD CONSTRAINT "PlanEtudesMatiere_volumeHoraire_positive" CHECK ("volumeHoraire" > 0);
ALTER TABLE "PlanEtudesMatiere" ADD CONSTRAINT "PlanEtudesMatiere_dureeCreneaux_positive" CHECK ("dureeCreneaux" > 0);
ALTER TABLE "PlanEtudesMatiere" ADD CONSTRAINT "PlanEtudesMatiere_coefficient_positive" CHECK ("coefficient" > 0);