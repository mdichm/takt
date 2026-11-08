-- TAKT-L05-03 — Complétion du modèle ChargeRuleSet (moteur de charge horaire).
-- Ajout : version, estActive, seuilAlerte, plafondHebdomadaire, arrondi, dureeJournee, dureeDemiJournee,
-- coefficientsParType (Json), cibleHebdomadaireParGrade (Json), toleranceEquilibrage.
-- Changement : code n'est plus unique seul, unicité composée (code, version).
-- Index sur estActive pour rechercher la version active.

-- 1. Ajout des nouvelles colonnes
ALTER TABLE "ChargeRuleSet" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ChargeRuleSet" ADD COLUMN "estActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChargeRuleSet" ADD COLUMN "seuilAlerte" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "ChargeRuleSet" ADD COLUMN "plafondHebdomadaire" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "ChargeRuleSet" ADD COLUMN "arrondi" TEXT NOT NULL DEFAULT 'UNITAIRE';
ALTER TABLE "ChargeRuleSet" ADD COLUMN "dureeJournee" DOUBLE PRECISION NOT NULL DEFAULT 7;
ALTER TABLE "ChargeRuleSet" ADD COLUMN "dureeDemiJournee" DOUBLE PRECISION NOT NULL DEFAULT 3.5;
ALTER TABLE "ChargeRuleSet" ADD COLUMN "coefficientsParType" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ChargeRuleSet" ADD COLUMN "cibleHebdomadaireParGrade" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ChargeRuleSet" ADD COLUMN "toleranceEquilibrage" DOUBLE PRECISION NOT NULL DEFAULT 5;

-- 2. Suppression de l'ancienne contrainte d'unicité sur code seul
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_code_key";

-- 3. Nouvelle contrainte d'unicité composée (code, version)
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_code_version_key" UNIQUE ("code", "version");

-- 4. Index sur estActive pour retrouver rapidement la version active
CREATE INDEX "ChargeRuleSet_estActive_idx" ON "ChargeRuleSet"("estActive");

-- 5. Contrainte CHECK : une seule version active par code (index unique partiel)
CREATE UNIQUE INDEX "ChargeRuleSet_code_estActive_unique" ON "ChargeRuleSet"("code") WHERE "estActive" = true;

-- 6. Contraintes de domaine
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_version_positive" CHECK ("version" > 0);
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_plafondHebdomadaire_positive" CHECK ("plafondHebdomadaire" > 0);
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_seuilAlerte_range" CHECK ("seuilAlerte" >= 0 AND "seuilAlerte" <= 100);
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_dureeJournee_positive" CHECK ("dureeJournee" > 0);
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_dureeDemiJournee_positive" CHECK ("dureeDemiJournee" > 0);
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_toleranceEquilibrage_nonnegative" CHECK ("toleranceEquilibrage" >= 0);
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_arrondi_valide" CHECK ("arrondi" IN ('UNITAIRE', 'DEMI_JOURNEE', 'JOURNEE'));