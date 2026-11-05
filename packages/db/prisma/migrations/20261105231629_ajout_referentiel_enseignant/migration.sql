-- CreateTable
CREATE TABLE "Enseignant" (
    "id" UUID NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gradeId" UUID,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enseignant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnseignantDepartement" (
    "enseignantId" UUID NOT NULL,
    "departementId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnseignantDepartement_pkey" PRIMARY KEY ("enseignantId","departementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enseignant_matricule_key" ON "Enseignant"("matricule");

-- CreateIndex
CREATE INDEX "Enseignant_matricule_idx" ON "Enseignant"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Enseignant_email_key" ON "Enseignant"("email");

-- CreateIndex
CREATE INDEX "Enseignant_email_idx" ON "Enseignant"("email");

-- CreateIndex
CREATE INDEX "Enseignant_gradeId_idx" ON "Enseignant"("gradeId");

-- CreateIndex
CREATE INDEX "Enseignant_nom_idx" ON "Enseignant"("nom");

-- CreateIndex
CREATE INDEX "Enseignant_prenom_idx" ON "Enseignant"("prenom");

-- CreateIndex
CREATE INDEX "EnseignantDepartement_enseignantId_idx" ON "EnseignantDepartement"("enseignantId");

-- CreateIndex
CREATE INDEX "EnseignantDepartement_departementId_idx" ON "EnseignantDepartement"("departementId");

-- AddForeignKey
ALTER TABLE "Enseignant" ADD CONSTRAINT "Enseignant_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnseignantDepartement" ADD CONSTRAINT "EnseignantDepartement_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnseignantDepartement" ADD CONSTRAINT "EnseignantDepartement_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE CASCADE ON UPDATE CASCADE;