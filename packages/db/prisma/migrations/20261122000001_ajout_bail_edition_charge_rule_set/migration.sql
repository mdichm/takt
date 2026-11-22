-- TAKT-L09-04 — bailEditionDureeMinutes sur ConfigSysteme
-- Conforme ST_TAKT §2 (modèle 15) et EX-DAT-05.

-- Ajout de la colonne bailEditionDureeMinutes sur ConfigSysteme
ALTER TABLE "ConfigSysteme"
    ADD COLUMN "bailEditionDureeMinutes" INTEGER NOT NULL DEFAULT 30;