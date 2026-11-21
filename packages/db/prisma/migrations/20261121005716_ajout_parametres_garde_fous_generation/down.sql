-- TAKT-L07-07 — Rollback : supprime les seuils de verrouillage de ConfigSysteme

ALTER TABLE "ConfigSysteme" DROP COLUMN IF EXISTS "avertissementVerrouillageBloquant";
ALTER TABLE "ConfigSysteme" DROP COLUMN IF EXISTS "seuilVerrouillageGeneration";