// ============================================================================
// TAKT — Schéma de validation de l'environnement
// Fichier : apps/backend/src/config/env.schema.ts
// Ticket : TAKT-L01-03
//
// Règle : toute variable d'environnement requise absente provoque l'arrêt
// explicite de l'application au démarrage (ST_TAKT §3.1, livrable ConfigModule).
// ============================================================================

import { z } from 'zod';

/**
 * Schéma Zod de l'environnement applicatif.
 * Les variables marquées « requise » sont absentes de `.env.example` en
 * production : l'application refuse de démarrer plutôt que d'utiliser une
 * valeur par défaut non sécurisée (GG-11).
 */
export const EnvSchema = z.object({
  // -- Application ----------------------------------------------------------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().min(1).default('api/v1'),
  APP_VERSION: z.string().min(1).default('1.0.0'),

  // -- Base de données (requis) ---------------------------------------------
  DATABASE_URL: z.string().min(1, 'URL de connexion à la base de données absente'),

  // -- JWT RS256 (requis) ----------------------------------------------------
  JWT_KEYS_DIRECTORY: z.string().min(1).default('/run/secrets/jwt'),
  JWT_ACTIVE_KEY_ID: z.string().min(1).default('active'),
  JWT_PREVIOUS_KEY_IDS: z.string().default(''),
  JWT_ISSUER: z.string().min(1).default('takt'),
  JWT_AUDIENCE: z.string().min(1).default('takt-api'),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_TTL: z.string().min(1).default('7d'),

  // -- CORS (origines autorisées, séparées par des virgules) ----------------
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8080'),

  // -- Fichiers --------------------------------------------------------------
  DERIVED_DIR: z.string().min(1).default('/tmp/derived'),
  SCENARIOS_DIR: z.string().min(1).default('/tmp/scenarios'),
});

/** Configuration applicative validée, telle qu'exposée par `ConfigService`. */
export type EnvConfig = z.infer<typeof EnvSchema>;

/** Description d'une anomalie d'environnement, prête à être journalisée. */
interface AnomalieEnvironnement {
  manquantes: string[];
  invalides: string[];
}

/**
 * Analyse les anomalies Zod et les répartit entre variables « manquantes »
 * (absentes de l'environnement) et variables « invalides » (mauvaise valeur).
 */
function classerAnomalies(issues: z.ZodIssue[]): AnomalieEnvironnement {
  const manquantes: string[] = [];
  const invalides: string[] = [];

  for (const issue of issues) {
    const nom = issue.path.join('.') || 'ENVIRONNEMENT';
    const absent = issue.code === 'invalid_type' && issue.received === 'undefined';
    if (absent) {
      manquantes.push(nom);
    } else {
      invalides.push(`${nom} (${issue.message})`);
    }
  }

  return { manquantes, invalides };
}

/**
 * Valide l'environnement de l'application.
 *
 * @throws Error si une variable requise est absente ou invalide. Le message
 *   liste explicitement les variables concernées afin que l'échec de démarrage
 *   soit actionnable (critère « Given une variable d'environnement requise
 *   absente, When l'application démarre, Then elle s'arrête avec une erreur
 *   explicite listant les variables manquantes »).
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const resultat = EnvSchema.safeParse(config);

  if (!resultat.success) {
    const { manquantes, invalides } = classerAnomalies(resultat.error.issues);
    const parties: string[] = [];

    if (manquantes.length > 0) {
      parties.push(`Variables d’environnement manquantes : ${manquantes.join(', ')}`);
    }
    if (invalides.length > 0) {
      parties.push(`Variables d’environnement invalides : ${invalides.join(', ')}`);
    }

    throw new Error(`Configuration d’environnement invalide — ${parties.join(' ; ')}`);
  }

  return resultat.data;
}
