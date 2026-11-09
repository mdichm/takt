-- TAKT-L05-05 — Revalidation ciblée d’un département impacté.
--
-- Ajout :
--   * colonnes revision + estCourant sur Snapshot (historique des révisions par département)
--   * index unique sur (versionId, departementId, revision) pour l’historique
--   * index unique partiel sur (versionId, departementId) WHERE estCourant (un seul courant)
--   * table ValidationRepartition (état de validation par département et version)
--   * table Notification (notifications in-app émises aux utilisateurs)

-- 1. Snapshot : colonnes de révision et de courant
ALTER TABLE "Snapshot" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Snapshot" ADD COLUMN "estCourant" BOOLEAN NOT NULL DEFAULT true;

-- 2. Remplacement de l’index unique partiel (versionId, departementId) par :
--    - un index sur (versionId, departementId, revision) → historique des révisions
--    - un index partiel (versionId, departementId) WHERE estCourant → un seul courant
DROP INDEX IF EXISTS "Snapshot_versionId_departementId_repartition_unique";

CREATE UNIQUE INDEX "Snapshot_versionId_departementId_revision_unique"
  ON "Snapshot"("versionId", "departementId", "revision")
  WHERE "departementId" IS NOT NULL;

CREATE UNIQUE INDEX "Snapshot_versionId_departementId_courant_unique"
  ON "Snapshot"("versionId", "departementId")
  WHERE "departementId" IS NOT NULL AND "estCourant";

-- 3. Table ValidationRepartition (état de validation par département et version)
CREATE TABLE "ValidationRepartition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "versionId" UUID NOT NULL,
  "departementId" UUID NOT NULL,
  "etat" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "hashAffectations" TEXT,
  "snapshotCourantId" UUID,
  "snapshotPrecedentId" UUID,
  "motif" TEXT,
  "revalidationDemandeeLe" TIMESTAMP(3),
  "revalidationDemandeePar" UUID,
  "valideLe" TIMESTAMP(3),
  "validePar" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ValidationRepartition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ValidationRepartition_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE CASCADE,
  CONSTRAINT "ValidationRepartition_departementId_fkey" FOREIGN KEY ("departementId") REFERENCES "Departement"("id") ON DELETE CASCADE,
  CONSTRAINT "ValidationRepartition_snapshotCourantId_fkey" FOREIGN KEY ("snapshotCourantId") REFERENCES "Snapshot"("id") ON DELETE SET NULL,
  CONSTRAINT "ValidationRepartition_snapshotPrecedentId_fkey" FOREIGN KEY ("snapshotPrecedentId") REFERENCES "Snapshot"("id") ON DELETE SET NULL
);

CREATE INDEX "ValidationRepartition_versionId_idx" ON "ValidationRepartition"("versionId");
CREATE INDEX "ValidationRepartition_departementId_idx" ON "ValidationRepartition"("departementId");
CREATE INDEX "ValidationRepartition_versionId_departementId_idx" ON "ValidationRepartition"("versionId", "departementId");

-- 4. Table Notification (notifications in-app)
CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "utilisateurId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "titre" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "lue" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE
);

CREATE INDEX "Notification_utilisateurId_idx" ON "Notification"("utilisateurId");
CREATE INDEX "Notification_utilisateurId_lue_idx" ON "Notification"("utilisateurId", "lue");
