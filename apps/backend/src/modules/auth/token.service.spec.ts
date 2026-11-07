// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { createSign, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthConfig, chargerConfigAuth } from '../../config/auth.config';
import { JwtStrategy } from './jwt-strategy';
import { InMemoryRevokedRefreshTokenStore } from './revoked-refresh-token.store';
import { TokenService } from './token.service';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';
const DEPARTEMENT_ID = '22222222-2222-4222-8222-222222222222';

describe('TokenService', () => {
  let dossier: string;
  let config: AuthConfig;
  let service: TokenService;

  beforeEach(() => {
    dossier = mkdtempSync(join(tmpdir(), 'takt-jwt-'));
    const premiere = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const seconde = generateKeyPairSync('rsa', { modulusLength: 2048 });

    writeFileSync(
      join(dossier, 'active.private.pem'),
      premiere.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    );
    writeFileSync(
      join(dossier, 'active.public.pem'),
      premiere.publicKey.export({ type: 'spki', format: 'pem' }),
    );
    writeFileSync(
      join(dossier, 'previous.private.pem'),
      seconde.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    );
    writeFileSync(
      join(dossier, 'previous.public.pem'),
      seconde.publicKey.export({ type: 'spki', format: 'pem' }),
    );

    config = chargerConfigAuth({
      JWT_KEYS_DIRECTORY: dossier,
      JWT_ACTIVE_KEY_ID: 'active',
      JWT_PREVIOUS_KEY_IDS: 'previous',
      JWT_ISSUER: 'takt-test',
      JWT_AUDIENCE: 'takt-api',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    });
    service = new TokenService(config, new InMemoryRevokedRefreshTokenStore());
  });

  afterEach(() => {
    rmSync(dossier, { recursive: true, force: true });
  });

  it('signe un access token RS256 avec les claims canoniques', () => {
    const resultat = service.signAccessToken({
      sub: UTILISATEUR_ID,
      role: 'gest',
      departementIds: [DEPARTEMENT_ID],
    });

    const [entete] = resultat.token.split('.');
    expect(entete).toBeDefined();
    const enTete = JSON.parse(Buffer.from(entete ?? '', 'base64url').toString('utf8')) as Record<
      string,
      string
    >;
    expect(enTete).toMatchObject({ alg: 'RS256', typ: 'JWT', kid: 'active' });

    const claims = service.verifyAccessToken(resultat.token);
    expect(claims).toMatchObject({
      sub: UTILISATEUR_ID,
      role: 'gest',
      departementIds: [DEPARTEMENT_ID],
      typ: 'access',
      iss: 'takt-test',
      aud: 'takt-api',
    });
    expect(claims.exp - claims.iat).toBe(15 * 60);
  });

  it('signe un refresh token de sept jours avec une famille et un jti uniques', () => {
    const premier = service.signRefreshToken(UTILISATEUR_ID);
    const second = service.signRefreshToken(UTILISATEUR_ID);

    expect(premier.claims.exp - premier.claims.iat).toBe(7 * 24 * 60 * 60);
    expect(premier.claims.jti).not.toBe(second.claims.jti);
    expect(premier.claims.familyId).not.toBe(second.claims.familyId);
  });

  it('rejette un access token signé par une autre clé', () => {
    const autre = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jetonFalsifie = signerJwtAvecCle(
      service.signAccessToken({ sub: UTILISATEUR_ID, role: 'admin', departementIds: [] }).token,
      autre.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    );

    expect(() => service.verifyAccessToken(jetonFalsifie)).toThrowError('Signature JWT invalide');
  });

  it('rejette un jeton expiré', () => {
    const serviceExpire = new TokenService(
      { ...config, accessTtlSeconds: -1 },
      new InMemoryRevokedRefreshTokenStore(),
    );
    const jeton = serviceExpire.signAccessToken({
      sub: UTILISATEUR_ID,
      role: 'admin',
      departementIds: [],
    });

    expect(() => serviceExpire.verifyAccessToken(jeton.token)).toThrowError('Jeton JWT expiré');
  });

  it('rejette alg none', () => {
    const entete = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT', kid: 'active' })).toString(
      'base64url',
    );
    const charge = Buffer.from(
      JSON.stringify({ typ: 'access', sub: UTILISATEUR_ID, role: 'admin', departementIds: [] }),
    ).toString('base64url');

    expect(() => service.verifyAccessToken(`${entete}.${charge}.`)).toThrowError(
      'Algorithme JWT non autorisé',
    );
  });

  it('refuse un refresh token déjà consommé et révoque sa famille', async () => {
    const refresh = service.signRefreshToken(UTILISATEUR_ID);

    const rotation = await service.rotateRefreshToken(refresh.token);
    expect(rotation.claims.familyId).toBe(refresh.claims.familyId);

    await expect(service.rotateRefreshToken(refresh.token)).rejects.toThrow(
      'Refresh token déjà utilisé',
    );
    await expect(service.verifyRefreshToken(rotation.token)).rejects.toThrow(
      'Refresh token révoqué',
    );
  });

  it('accepte une clé publique précédente pendant la rotation', () => {
    const jetonAncien = signerJwtAvecCle(
      service.signAccessToken({ sub: UTILISATEUR_ID, role: 'admin', departementIds: [] }).token,
      readFileSync(join(dossier, 'previous.private.pem'), 'utf8'),
      'previous',
    );

    expect(new JwtStrategy(config).verifyAccessToken(jetonAncien).sub).toBe(UTILISATEUR_ID);
  });
});

/** Recrée une signature avec une clé privée et un kid fournis. */
function signerJwtAvecCle(jeton: string, clePrivée: string, kid = 'active'): string {
  const [, chargeBase64] = jeton.split('.');
  const entete = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString(
    'base64url',
  );
  const signataire = createSign('RSA-SHA256');
  signataire.update(`${entete}.${chargeBase64}`);
  const signature = signataire.sign(clePrivée).toString('base64url');
  return `${entete}.${chargeBase64}.${signature}`;
}
