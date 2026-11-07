-- TAKT — Rollback : suppression du hash de mot de passe et table SessionRefresh
-- Ticket : TAKT-L03-03 — GG-08 (rollback)

-- DropForeignKey
ALTER TABLE "public"."SessionRefresh" DROP CONSTRAINT "SessionRefresh_utilisateurId_fkey";

-- DropIndex
DROP INDEX "public"."SessionRefresh_expiresAt_idx";

-- DropIndex
DROP INDEX "public"."SessionRefresh_utilisateurId_idx";

-- DropIndex
DROP INDEX "public"."SessionRefresh_familyId_idx";

-- DropIndex
DROP INDEX "public"."SessionRefresh_jti_idx";

-- DropIndex
DROP INDEX "public"."SessionRefresh_jti_key";

-- DropTable
DROP TABLE "public"."SessionRefresh";

-- DropColumn
ALTER TABLE "public"."Utilisateur" DROP COLUMN "motDePasseHash";