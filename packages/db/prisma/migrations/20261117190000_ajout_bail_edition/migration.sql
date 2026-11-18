-- TAKT-L06-07 — Ajout du modèle BailEdition (bail d'édition exclusif, 30 min)

-- CreateTable
CREATE TABLE "BailEdition" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "derniereActivite" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BailEdition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BailEdition_versionId_key" ON "BailEdition"("versionId");

-- CreateIndex
CREATE INDEX "BailEdition_dateFin_idx" ON "BailEdition"("dateFin");

-- CreateIndex
CREATE INDEX "BailEdition_utilisateurId_idx" ON "BailEdition"("utilisateurId");

-- AddForeignKey
ALTER TABLE "BailEdition" ADD CONSTRAINT "BailEdition_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BailEdition" ADD CONSTRAINT "BailEdition_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
