-- TAKT-L09-04 — Rollback : supprime ChargeRuleSet et retire bailEditionDureeMinutes

DROP INDEX IF EXISTS "ChargeRuleSet_estActif_idx";
DROP TABLE IF EXISTS "ChargeRuleSet";

ALTER TABLE "ConfigSysteme"
    DROP COLUMN "bailEditionDureeMinutes";