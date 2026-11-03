-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN     "motDePasseHash" TEXT;

-- CreateTable
CREATE TABLE "SessionRefresh" (
    "id" UUID NOT NULL,
    "jti" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "estRevoque" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRefresh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionRefresh_jti_key" ON "SessionRefresh"("jti");

-- CreateIndex
CREATE INDEX "SessionRefresh_jti_idx" ON "SessionRefresh"("jti");

-- CreateIndex
CREATE INDEX "SessionRefresh_familyId_idx" ON "SessionRefresh"("familyId");

-- CreateIndex
CREATE INDEX "SessionRefresh_utilisateurId_idx" ON "SessionRefresh"("utilisateurId");

-- CreateIndex
CREATE INDEX "SessionRefresh_expiresAt_idx" ON "SessionRefresh"("expiresAt");

-- AddForeignKey
ALTER TABLE "SessionRefresh" ADD CONSTRAINT "SessionRefresh_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
