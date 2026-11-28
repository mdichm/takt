-- TAKT-L11-01 — Table SecurityEvent (événements de sécurité, lecture seule)
-- Conforme ST_TAKT §2 (modèle 15) et EX-DAT-05 / TE-SEC-05.
-- Aucun utilisateur obligatoire : certains événements sont anonymes (ex: login échoué sans compte connu).

CREATE TABLE "SecurityEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "utilisateurId" UUID,
    "ip" TEXT,
    "userAgent" TEXT,
    "details" JSON,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SecurityEvent_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL
);

CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");
CREATE INDEX "SecurityEvent_type_idx" ON "SecurityEvent"("type");
CREATE INDEX "SecurityEvent_utilisateurId_idx" ON "SecurityEvent"("utilisateurId");