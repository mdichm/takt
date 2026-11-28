-- TAKT-L11-01 — Rollback : supprime la table SecurityEvent

DROP INDEX IF EXISTS "SecurityEvent_utilisateurId_idx";
DROP INDEX IF EXISTS "SecurityEvent_type_idx";
DROP INDEX IF EXISTS "SecurityEvent_createdAt_idx";
DROP TABLE IF EXISTS "SecurityEvent";