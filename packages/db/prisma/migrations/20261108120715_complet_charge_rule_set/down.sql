-- TAKT-L05-03 — Rollback : retour à l'état antérieur de ChargeRuleSet.
-- Suppression : version, estActive, seuilAlerte, plafondHebdomadaire, arrondi, dureeJournee, dureeDemiJournee,
-- coefficientsParType, cibleHebdomadaireParGrade, toleranceEquilibrage.
-- Restauration : contrainte d'unicité sur code seul.

-- 1. Suppression des contraintes et index
DROP INDEX IF EXISTS "ChargeRuleSet_code_estActive_unique";
DROP INDEX IF EXISTS "ChargeRuleSet_estActive_idx";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_code_version_key";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_version_positive";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_plafondHebdomadaire_positive";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_seuilAlerte_range";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_dureeJournee_positive";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_dureeDemiJournee_positive";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_toleranceEquilibrage_nonnegative";
ALTER TABLE "ChargeRuleSet" DROP CONSTRAINT "ChargeRuleSet_arrondi_valide";

-- 2. Restauration de l'unicité sur code seul
ALTER TABLE "ChargeRuleSet" ADD CONSTRAINT "ChargeRuleSet_code_key" UNIQUE ("code");

-- 3. Suppression des colonnes ajoutées
ALTER TABLE "ChargeRuleSet" DROP COLUMN "toleranceEquilibrage";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "cibleHebdomadaireParGrade";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "coefficientsParType";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "dureeDemiJournee";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "dureeJournee";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "arrondi";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "plafondHebdomadaire";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "seuilAlerte";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "estActive";
ALTER TABLE "ChargeRuleSet" DROP COLUMN "version";