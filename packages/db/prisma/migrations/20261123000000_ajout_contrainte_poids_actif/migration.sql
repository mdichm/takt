-- Migration: ajout de `poids` et `estActif` sur le modèle `Contrainte`
-- Ticket : TAKT-L09-06 — SPEC_CONTRAINTES_GENERATION.md §9.2
-- Rétro-compatible : `poids` NULL ⇒ repli sur le poids canonique du type ;
-- `estActif` DEFAULT true ⇒ comportement inchangé pour les lignes existantes.

ALTER TABLE "Contrainte" ADD COLUMN "poids" INTEGER;
ALTER TABLE "Contrainte" ADD COLUMN "estActif" BOOLEAN NOT NULL DEFAULT true;
