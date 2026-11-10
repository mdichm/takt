-- Migration: 20261110120000_create_etat_version_enum
-- Description: Conversion de Version.etat (TEXT) en enum EtatVersion, ajout de anneeId, datePublication, publiePar, index composite et unicité de publication par semestre.

-- 1. Création du type enum PostgreSQL
CREATE TYPE "EtatVersion" AS ENUM (
  'initial',
  'rep_pedag',
  'brouillon',
  'generation',
  'edition',
  'valid_pedag',
  'valid_dir',
  'valide',
  'publie',
  'archive'
);

-- 2. Ajout de la colonne anneeId (nullable d'abord pour le backfill)
ALTER TABLE "Version" ADD COLUMN "anneeId" UUID;

-- 3. Conversion de etat TEXT -> EtatVersion (vérifie que toutes les valeurs existent dans l'enum)
ALTER TABLE "Version" ALTER COLUMN "etat" TYPE "EtatVersion" USING "etat"::"EtatVersion";
ALTER TABLE "Version" ALTER COLUMN "etat" SET DEFAULT 'initial';

-- 4. Ajout des colonnes de publication
ALTER TABLE "Version" ADD COLUMN "datePublication" TIMESTAMP(3);
ALTER TABLE "Version" ADD COLUMN "publiePar" UUID;

-- 5. Clés étrangères
ALTER TABLE "Version" ADD CONSTRAINT "Version_anneeId_fkey" FOREIGN KEY ("anneeId") REFERENCES "AnneeUniversitaire"("id");
ALTER TABLE "Version" ADD CONSTRAINT "Version_publiePar_fkey" FOREIGN KEY ("publiePar") REFERENCES "Utilisateur"("id");

-- 6. Backfill de anneeId depuis Semestre.anneeUniversitaireId
UPDATE "Version" v
SET "anneeId" = s."anneeUniversitaireId"
FROM "Semestre" s
WHERE v."semestreId" = s."id";

-- 7. anneeId devient NOT NULL
ALTER TABLE "Version" ALTER COLUMN "anneeId" SET NOT NULL;

-- 8. Remplacement des index simples par l'index composite (ST_TAKT §2.4)
DROP INDEX IF EXISTS "Version_etat_idx";
CREATE INDEX "Version_semestreId_etat_idx" ON "Version"("semestreId", "etat");

-- 9. Unicité de publication : une seule version 'publie' par semestre
CREATE UNIQUE INDEX "Version_semestreId_publie_key" ON "Version"("semestreId") WHERE "etat" = 'publie';