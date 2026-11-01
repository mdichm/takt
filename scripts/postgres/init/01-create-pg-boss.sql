-- ============================================================================
-- TAKT — Initialisation PostgreSQL de développement
-- Fichier : scripts/postgres/init/01-create-pg-boss.sql
-- Ticket : TAKT-L01-06
-- ============================================================================

-- La base pg_boss est dédiée au traitement asynchrone des jobs.
CREATE DATABASE pg_boss;
