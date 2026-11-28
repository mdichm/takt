-- Rollback : suppression de `poids` et `estActif` sur `Contrainte`
ALTER TABLE "Contrainte" DROP COLUMN "estActif";
ALTER TABLE "Contrainte" DROP COLUMN "poids";
