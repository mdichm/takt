-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypeSalle" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypeSalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipement" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salle" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "typeSalleId" UUID NOT NULL,
    "capacite" INTEGER NOT NULL,
    "siteId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalleEquipement" (
    "salleId" UUID NOT NULL,
    "equipementId" UUID NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalleEquipement_pkey" PRIMARY KEY ("salleId","equipementId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE INDEX "Site_code_idx" ON "Site"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TypeSalle_code_key" ON "TypeSalle"("code");

-- CreateIndex
CREATE INDEX "TypeSalle_code_idx" ON "TypeSalle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Equipement_code_key" ON "Equipement"("code");

-- CreateIndex
CREATE INDEX "Equipement_code_idx" ON "Equipement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Salle_code_key" ON "Salle"("code");

-- CreateIndex
CREATE INDEX "Salle_code_idx" ON "Salle"("code");

-- CreateIndex
CREATE INDEX "Salle_typeSalleId_idx" ON "Salle"("typeSalleId");

-- CreateIndex
CREATE INDEX "Salle_siteId_idx" ON "Salle"("siteId");

-- CreateIndex
CREATE INDEX "Salle_capacite_idx" ON "Salle"("capacite");

-- CreateIndex
CREATE INDEX "SalleEquipement_salleId_idx" ON "SalleEquipement"("salleId");

-- CreateIndex
CREATE INDEX "SalleEquipement_equipementId_idx" ON "SalleEquipement"("equipementId");

-- AddForeignKey
ALTER TABLE "Salle" ADD CONSTRAINT "Salle_typeSalleId_fkey" FOREIGN KEY ("typeSalleId") REFERENCES "TypeSalle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salle" ADD CONSTRAINT "Salle_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalleEquipement" ADD CONSTRAINT "SalleEquipement_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalleEquipement" ADD CONSTRAINT "SalleEquipement_equipementId_fkey" FOREIGN KEY ("equipementId") REFERENCES "Equipement"("id") ON DELETE CASCADE ON UPDATE CASCADE;