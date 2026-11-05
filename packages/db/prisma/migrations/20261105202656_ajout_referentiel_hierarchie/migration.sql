/*
  Warnings:

  - Added the required column `etablissementId` to the `Departement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Departement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Departement" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "etablissementId" UUID NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Etablissement" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Etablissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcours" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "departementId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parcours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Niveau" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "parcoursId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Niveau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Groupe" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "niveauId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Groupe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Etablissement_code_key" ON "Etablissement"("code");

-- CreateIndex
CREATE INDEX "Etablissement_code_idx" ON "Etablissement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Parcours_code_key" ON "Parcours"("code");

-- CreateIndex
CREATE INDEX "Parcours_code_idx" ON "Parcours"("code");

-- CreateIndex
CREATE INDEX "Parcours_departementId_idx" ON "Parcours"("departementId");

-- CreateIndex
CREATE UNIQUE INDEX "Niveau_code_key" ON "Niveau"("code");

-- CreateIndex
CREATE INDEX "Niveau_code_idx" ON "Niveau"("code");

-- CreateIndex
CREATE INDEX "Niveau_parcoursId_idx" ON "Niveau"("parcoursId");

-- CreateIndex
CREATE UNIQUE INDEX "Groupe_code_key" ON "Groupe"("code");

-- CreateIndex
CREATE INDEX "Groupe_code_idx" ON "Groupe"("code");

-- CreateIndex
CREATE INDEX "Groupe_niveauId_idx" ON "Groupe"("niveauId");

-- CreateIndex
CREATE INDEX "Departement_etablissementId_idx" ON "Departement"("etablissementId");

-- AddForeignKey
ALTER TABLE "Departement" ADD CONSTRAINT "Departement_etablissementId_fkey" FOREIGN KEY ("etablissementId") REFERENCES "Etablissement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcours" ADD CONSTRAINT "Parcours_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Niveau" ADD CONSTRAINT "Niveau_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "Parcours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Groupe" ADD CONSTRAINT "Groupe_niveauId_fkey" FOREIGN KEY ("niveauId") REFERENCES "Niveau"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
