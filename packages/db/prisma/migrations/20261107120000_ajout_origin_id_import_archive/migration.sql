-- AlterTable
ALTER TABLE "Parcours" ADD COLUMN "originId" UUID;

-- AlterTable
ALTER TABLE "Groupe" ADD COLUMN "originId" UUID;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN "originId" UUID;

-- AlterTable
ALTER TABLE "Matiere" ADD COLUMN "originId" UUID;

-- AlterTable
ALTER TABLE "Salle" ADD COLUMN "originId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Parcours_originId_key" ON "Parcours"("originId");

-- CreateIndex
CREATE UNIQUE INDEX "Groupe_originId_key" ON "Groupe"("originId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_originId_key" ON "Module"("originId");

-- CreateIndex
CREATE UNIQUE INDEX "Matiere_originId_key" ON "Matiere"("originId");

-- CreateIndex
CREATE UNIQUE INDEX "Salle_originId_key" ON "Salle"("originId");