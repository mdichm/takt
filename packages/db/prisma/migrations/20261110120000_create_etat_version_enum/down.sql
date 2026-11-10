-- Rollback: 20261110120000_create_etat_version_enum
-- Restaure l'état précédent de la table Version (etat en TEXT, colonnes supprimées).

-- 1. Suppression de l'index unique partiel de publication
DROP INDEX IF EXISTS "Version_semestreId_publie_key";

-- 2. Remplacement de l'index composite par l'index simple sur etat
DROP INDEX IF EXISTS "Version_semestreId_etat_idx";
CREATE INDEX "Version_etat_idx" ON "Version"("etat");

-- 3. Suppression des contraintes de clés étrangères
ALTER TABLE "Version" DROP CONSTRAINT IF EXISTS "Version_publiePar_fkey";
ALTER TABLE "Version" DROP CONSTRAINT IF EXISTS "Version_anneeId_fkey";

-- 4. Suppression des colonnes de publication
ALTER TABLE "Version" DROP COLUMN IF EXISTS "publiePar";
ALTER TABLE "Version" DROP COLUMN IF EXISTS "datePublication";

-- 5. Restauration de etat en TEXT
ALTER TABLE "Version" ALTER COLUMN "etat" DROP DEFAULT;
ALTER TABLE "Version" ALTER COLUMN "etat" TYPE TEXT USING "etat"::TEXT;

-- 6. Suppression de anneeId
ALTER TABLE "Version" ALTER COLUMN "anneeId" DROP NOT NULL;
ALTER TABLE "Version" DROP COLUMN IF EXISTS "anneeId";

-- 7. Suppression du type enum
DROP TYPE IF EXISTS "EtatVersion";