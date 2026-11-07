// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Configuration cryptographique et temporelle du module Auth. */
export interface AuthConfig {
  keysDirectory: string;
  activeKeyId: string;
  previousKeyIds: string[];
  issuer: string;
  audience: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

/** Variables d'environnement consommées par la configuration Auth. */
export interface EnvAuthConfig {
  JWT_KEYS_DIRECTORY: string;
  JWT_ACTIVE_KEY_ID: string;
  JWT_PREVIOUS_KEY_IDS: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_TTL: string;
}

/** Convertit une durée relative (`15m`, `7d`) en secondes. */
export function convertirDureeEnSecondes(duree: string): number {
  const correspondance = /^(\d+)(s|m|h|d)$/.exec(duree);
  if (!correspondance) {
    throw new Error(`Durée JWT invalide : ${duree}`);
  }
  const valeur = Number(correspondance[1]);
  const unite = correspondance[2] as 's' | 'm' | 'h' | 'd';
  const multiplicateur: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86_400,
  };
  return valeur * multiplicateur[unite];
}

/** Charge et valide la configuration Auth depuis l'environnement. */
export function chargerConfigAuth(env: EnvAuthConfig): AuthConfig {
  const config: AuthConfig = {
    keysDirectory: env.JWT_KEYS_DIRECTORY,
    activeKeyId: env.JWT_ACTIVE_KEY_ID,
    previousKeyIds: env.JWT_PREVIOUS_KEY_IDS.split(',')
      .map((valeur) => valeur.trim())
      .filter((valeur) => valeur.length > 0),
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    accessTtlSeconds: convertirDureeEnSecondes(env.JWT_ACCESS_TTL),
    refreshTtlSeconds: convertirDureeEnSecondes(env.JWT_REFRESH_TTL),
  };

  if (!config.keysDirectory || !config.activeKeyId || !config.issuer || !config.audience) {
    throw new Error('Configuration Auth incomplète');
  }
  return config;
}

/** Lit une clé PEM depuis le répertoire de clés configuré. */
export function lireClePem(config: AuthConfig, kid: string, type: 'private' | 'public'): string {
  return readFileSync(join(config.keysDirectory, `${kid}.${type}.pem`), 'utf8');
}
