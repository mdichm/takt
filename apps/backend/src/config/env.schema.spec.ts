// ============================================================================
// TAKT — Tests unitaires du schéma d'environnement
// Fichier : apps/backend/src/config/env.schema.spec.ts
// Ticket : TAKT-L01-03
// ============================================================================

import { describe, it, expect } from 'vitest';
import { validateEnv, EnvSchema } from './env.schema';

const ENV_VALIDE = {
  DATABASE_URL: 'postgresql://takt:takt@localhost:5432/takt_dev',
};

describe('validateEnv', () => {
  it('rejette une configuration vide et liste les variables manquantes', () => {
    expect(() => validateEnv({})).toThrowError(/DATABASE_URL/);
  });

  it('signale explicitement les variables manquantes dans le message', () => {
    let message = '';
    try {
      validateEnv({});
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('Variables d’environnement manquantes');
    expect(message).toContain('DATABASE_URL');
  });

  it('indique la variable invalide et la raison', () => {
    let message = '';
    try {
      validateEnv({ ...ENV_VALIDE, PORT: 'abc' });
    } catch (error: unknown) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('PORT');
  });

  it('accepte une configuration valide et applique les valeurs par défaut', () => {
    const config = validateEnv(ENV_VALIDE);
    expect(config.DATABASE_URL).toBe(ENV_VALIDE.DATABASE_URL);
    expect(config.PORT).toBe(3000);
    expect(config.API_PREFIX).toBe('api/v1');
    expect(config.NODE_ENV).toBe('development');
  });

  it('convertit PORT en nombre', () => {
    expect(validateEnv({ ...ENV_VALIDE, PORT: '8080' }).PORT).toBe(8080);
  });

  it('applique les valeurs RSA par défaut', () => {
    const config = validateEnv(ENV_VALIDE);
    expect(config.JWT_KEYS_DIRECTORY).toBe('/run/secrets/jwt');
    expect(config.JWT_ACTIVE_KEY_ID).toBe('active');
    expect(config.JWT_ISSUER).toBe('takt');
    expect(config.JWT_AUDIENCE).toBe('takt-api');
  });

  it('refuse un identifiant de clé JWT vide', () => {
    expect(() => validateEnv({ ...ENV_VALIDE, JWT_ACTIVE_KEY_ID: '' })).toThrowError(
      /JWT_ACTIVE_KEY_ID/,
    );
  });

  it('refuse un NODE_ENV inconnu', () => {
    expect(() => validateEnv({ ...ENV_VALIDE, NODE_ENV: 'productionn' })).toThrowError(/NODE_ENV/);
  });
});

describe('EnvSchema', () => {
  it('expose une enveloppe d’environnement typée', () => {
    const parsed = EnvSchema.safeParse(ENV_VALIDE);
    expect(parsed.success).toBe(true);
  });
});
