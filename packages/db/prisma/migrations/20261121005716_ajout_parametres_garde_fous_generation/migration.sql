-- TAKT-L07-07 — Paramètres garde-fous de génération (EX-OUV-01)
-- Ajoute les seuils de verrouillage sur ConfigSysteme (singleton).
-- Valeur canonique 75% arbitrée en L00-02 ; alias SPEC_CONTRAINTES_GENERATION §8.2 : seuil_verrouillage_risque_pct.

-- 1. Seuil de taux de verrouillage max avant avertissement (1-100, défaut 75)
ALTER TABLE "ConfigSysteme" ADD COLUMN "seuilVerrouillageGeneration" INTEGER NOT NULL DEFAULT 75;

-- 2. L'avertissement de taux élevé bloque-t-il le lancement (défaut true)
ALTER TABLE "ConfigSysteme" ADD COLUMN "avertissementVerrouillageBloquant" BOOLEAN NOT NULL DEFAULT true;