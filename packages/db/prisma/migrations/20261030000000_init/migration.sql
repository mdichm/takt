-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "departementId" UUID,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departement" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "Departement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnneeUniversitaire" (
    "id" UUID NOT NULL,
    "libelle" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnneeUniversitaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semestre" (
    "id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "anneeUniversitaireId" UUID NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semestre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Version" (
    "id" UUID NOT NULL,
    "semestreId" UUID NOT NULL,
    "etat" TEXT NOT NULL,
    "snapshotId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "donnees" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectationPedagogique" (
    "id" UUID NOT NULL,
    "semestreId" UUID NOT NULL,
    "departementId" UUID NOT NULL,
    "enseignantId" UUID NOT NULL,
    "matiereId" UUID NOT NULL,
    "groupeId" UUID NOT NULL,
    "volumeHoraire" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffectationPedagogique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seance" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "jour" INTEGER NOT NULL,
    "creneauDebut" INTEGER NOT NULL,
    "nbCreneaux" INTEGER NOT NULL,
    "salleId" UUID,
    "enseignantId" UUID,
    "groupeId" UUID,
    "activiteId" UUID,
    "estVerrouillee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerrouSeance" (
    "id" UUID NOT NULL,
    "seanceId" UUID NOT NULL,
    "utilisateurId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "heurePose" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heureExpiration" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerrouSeance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrainte" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "cibleId" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrainte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Generation" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "statut" TEXT NOT NULL,
    "fichierDerivesId" UUID,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" UUID NOT NULL,
    "generationId" UUID NOT NULL,
    "scoreGlobal" INTEGER NOT NULL,
    "sousScores" JSONB NOT NULL,
    "selectionne" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "format" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "dateGeneration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAudit" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "horodatage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateurId" UUID,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "metadonnees" JSONB,

    CONSTRAINT "JournalAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_email_idx" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_roleId_idx" ON "Utilisateur"("roleId");

-- CreateIndex
CREATE INDEX "Utilisateur_departementId_idx" ON "Utilisateur"("departementId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "Role_code_idx" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Departement_code_key" ON "Departement"("code");

-- CreateIndex
CREATE INDEX "Departement_code_idx" ON "Departement"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AnneeUniversitaire_libelle_key" ON "AnneeUniversitaire"("libelle");

-- CreateIndex
CREATE INDEX "AnneeUniversitaire_libelle_idx" ON "AnneeUniversitaire"("libelle");

-- CreateIndex
CREATE INDEX "Semestre_anneeUniversitaireId_idx" ON "Semestre"("anneeUniversitaireId");

-- CreateIndex
CREATE INDEX "Semestre_numero_idx" ON "Semestre"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Semestre_anneeUniversitaireId_numero_key" ON "Semestre"("anneeUniversitaireId", "numero");

-- CreateIndex
CREATE INDEX "Version_semestreId_idx" ON "Version"("semestreId");

-- CreateIndex
CREATE INDEX "Version_etat_idx" ON "Version"("etat");

-- CreateIndex
CREATE INDEX "Snapshot_versionId_idx" ON "Snapshot"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "Snapshot_versionId_key" ON "Snapshot"("versionId");

-- CreateIndex
CREATE INDEX "AffectationPedagogique_semestreId_idx" ON "AffectationPedagogique"("semestreId");

-- CreateIndex
CREATE INDEX "AffectationPedagogique_departementId_idx" ON "AffectationPedagogique"("departementId");

-- CreateIndex
CREATE INDEX "AffectationPedagogique_enseignantId_idx" ON "AffectationPedagogique"("enseignantId");

-- CreateIndex
CREATE INDEX "Seance_versionId_idx" ON "Seance"("versionId");

-- CreateIndex
CREATE INDEX "Seance_versionId_jour_idx" ON "Seance"("versionId", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "Seance_versionId_jour_creneauDebut_nbCreneaux_key" ON "Seance"("versionId", "jour", "creneauDebut", "nbCreneaux");

-- CreateIndex
CREATE INDEX "VerrouSeance_seanceId_idx" ON "VerrouSeance"("seanceId");

-- CreateIndex
CREATE INDEX "VerrouSeance_utilisateurId_idx" ON "VerrouSeance"("utilisateurId");

-- CreateIndex
CREATE INDEX "VerrouSeance_heureExpiration_idx" ON "VerrouSeance"("heureExpiration");

-- CreateIndex
CREATE INDEX "Contrainte_versionId_idx" ON "Contrainte"("versionId");

-- CreateIndex
CREATE INDEX "Contrainte_type_idx" ON "Contrainte"("type");

-- CreateIndex
CREATE INDEX "Generation_versionId_idx" ON "Generation"("versionId");

-- CreateIndex
CREATE INDEX "Generation_statut_idx" ON "Generation"("statut");

-- CreateIndex
CREATE INDEX "Scenario_generationId_idx" ON "Scenario"("generationId");

-- CreateIndex
CREATE INDEX "Scenario_selectionne_idx" ON "Scenario"("selectionne");

-- CreateIndex
CREATE INDEX "Export_versionId_idx" ON "Export"("versionId");

-- CreateIndex
CREATE INDEX "Export_format_idx" ON "Export"("format");

-- CreateIndex
CREATE INDEX "JournalAudit_horodatage_idx" ON "JournalAudit"("horodatage");

-- CreateIndex
CREATE INDEX "JournalAudit_action_idx" ON "JournalAudit"("action");

-- CreateIndex
CREATE INDEX "JournalAudit_utilisateurId_idx" ON "JournalAudit"("utilisateurId");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semestre" ADD CONSTRAINT "Semestre_anneeUniversitaireId_fkey" FOREIGN KEY ("anneeUniversitaireId") REFERENCES "AnneeUniversitaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_semestreId_fkey" FOREIGN KEY ("semestreId") REFERENCES "Semestre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_semestreId_fkey" FOREIGN KEY ("semestreId") REFERENCES "Semestre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationPedagogique" ADD CONSTRAINT "AffectationPedagogique_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerrouSeance" ADD CONSTRAINT "VerrouSeance_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerrouSeance" ADD CONSTRAINT "VerrouSeance_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrainte" ADD CONSTRAINT "Contrainte_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalAudit" ADD CONSTRAINT "JournalAudit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
