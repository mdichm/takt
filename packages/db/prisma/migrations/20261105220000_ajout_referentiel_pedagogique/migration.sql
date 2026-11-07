/*
  Warnings:

  - Added required columns to new tables. This is not possible if the database is not empty.
*/

-- CreateTable
CREATE TABLE "TypeEnseignement" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "couleur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypeEnseignement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeTypeEnseignement" (
    "id" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "typeEnseignementId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeTypeEnseignement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "typeEnseignementId" UUID NOT NULL,
    "gradeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matiere" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "moduleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matiere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeRuleSet" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TypeEnseignement_code_key" ON "TypeEnseignement"("code");

-- CreateIndex
CREATE INDEX "TypeEnseignement_code_idx" ON "TypeEnseignement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_code_key" ON "Grade"("code");

-- CreateIndex
CREATE INDEX "Grade_code_idx" ON "Grade"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GradeTypeEnseignement_gradeId_typeEnseignementId_key" ON "GradeTypeEnseignement"("gradeId", "typeEnseignementId");

-- CreateIndex
CREATE INDEX "GradeTypeEnseignement_gradeId_idx" ON "GradeTypeEnseignement"("gradeId");

-- CreateIndex
CREATE INDEX "GradeTypeEnseignement_typeEnseignementId_idx" ON "GradeTypeEnseignement"("typeEnseignementId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_code_key" ON "Module"("code");

-- CreateIndex
CREATE INDEX "Module_code_idx" ON "Module"("code");

-- CreateIndex
CREATE INDEX "Module_typeEnseignementId_idx" ON "Module"("typeEnseignementId");

-- CreateIndex
CREATE INDEX "Module_gradeId_idx" ON "Module"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "Matiere_code_key" ON "Matiere"("code");

-- CreateIndex
CREATE INDEX "Matiere_code_idx" ON "Matiere"("code");

-- CreateIndex
CREATE INDEX "Matiere_moduleId_idx" ON "Matiere"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ChargeRuleSet_code_key" ON "ChargeRuleSet"("code");

-- CreateIndex
CREATE INDEX "ChargeRuleSet_code_idx" ON "ChargeRuleSet"("code");

-- AddForeignKey
ALTER TABLE "GradeTypeEnseignement" ADD CONSTRAINT "GradeTypeEnseignement_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeTypeEnseignement" ADD CONSTRAINT "GradeTypeEnseignement_typeEnseignementId_fkey" FOREIGN KEY ("typeEnseignementId") REFERENCES "TypeEnseignement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_typeEnseignementId_fkey" FOREIGN KEY ("typeEnseignementId") REFERENCES "TypeEnseignement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matiere" ADD CONSTRAINT "Matiere_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;