-- CreateTable
CREATE TABLE "ConfigSysteme" (
    "id" UUID NOT NULL,
    "pasDeTempsMinutes" INTEGER NOT NULL DEFAULT 30,
    "joursOuvres" TEXT NOT NULL,
    "creneauxParJour" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigSysteme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreneauAffichage" (
    "id" UUID NOT NULL,
    "variante" TEXT NOT NULL,
    "decalageMinutes" INTEGER NOT NULL DEFAULT 0,
    "plageReduiteMinutes" INTEGER,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreneauAffichage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creneau" (
    "id" UUID NOT NULL,
    "jour" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL,
    "heureDebut" TIMESTAMP(3) NOT NULL,
    "heureFin" TIMESTAMP(3) NOT NULL,
    "dureeMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creneau_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigSysteme_id_key" ON "ConfigSysteme"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CreneauAffichage_variante_key" ON "CreneauAffichage"("variante");

-- CreateIndex
CREATE UNIQUE INDEX "Creneau_jour_ordre_key" ON "Creneau"("jour", "ordre");

-- CreateIndex
CREATE INDEX "Creneau_jour_idx" ON "Creneau"("jour");