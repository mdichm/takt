// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { createSign, randomUUID } from 'node:crypto';
import { zAccessTokenClaims, zRefreshTokenClaims } from '@takt/contracts';
import { AuthConfig, lireClePem } from '../../config/auth.config';
import { ErreurJwt, JwtStrategy } from './jwt-strategy';
import { RevokedRefreshTokenStore } from './revoked-refresh-token.store';

/** Identité applicative portée par un access token. */
export interface IdentiteAccessToken {
  sub: string;
  role: 'admin' | 'gest' | 'rdep' | 'dir';
  departementIds: string[];
}

/** Jeton signé et claims correspondants. */
export interface JetonSigne<T> {
  token: string;
  claims: T;
}

/** Service de signature, validation et rotation des jetons RS256. */
export class TokenService {
  private readonly strategy: JwtStrategy;

  constructor(
    private readonly config: AuthConfig,
    private readonly revokedStore: RevokedRefreshTokenStore,
  ) {
    this.strategy = new JwtStrategy(config);
  }

  /** Signe un access token de durée courte. */
  signAccessToken(
    identite: IdentiteAccessToken,
  ): JetonSigne<ReturnType<typeof zAccessTokenClaims.parse>> {
    const maintenant = Math.floor(Date.now() / 1000);
    const claims = zAccessTokenClaims.parse({
      ...identite,
      typ: 'access',
      jti: randomUUID(),
      iat: maintenant,
      nbf: maintenant,
      exp: maintenant + this.config.accessTtlSeconds,
      iss: this.config.issuer,
      aud: this.config.audience,
    });
    return { token: this.signer(claims), claims };
  }

  /** Signe un refresh token belonging to a new rotation family. */
  signRefreshToken(sub: string): JetonSigne<ReturnType<typeof zRefreshTokenClaims.parse>> {
    const maintenant = Math.floor(Date.now() / 1000);
    const claims = zRefreshTokenClaims.parse({
      typ: 'refresh',
      sub,
      jti: randomUUID(),
      familyId: randomUUID(),
      iat: maintenant,
      nbf: maintenant,
      exp: maintenant + this.config.refreshTtlSeconds,
      iss: this.config.issuer,
      aud: this.config.audience,
    });
    return { token: this.signer(claims), claims };
  }

  /** Vérifie un access token. */
  verifyAccessToken(token: string): ReturnType<typeof zAccessTokenClaims.parse> {
    return this.strategy.verifyAccessToken(token);
  }

  /** Vérifie un refresh token et l'état de sa famille. */
  verifyRefreshToken(token: string): ReturnType<typeof zRefreshTokenClaims.parse> {
    const claims = this.strategy.verifyRefreshToken(token);
    if (this.revokedStore.isRevoked(claims.jti, claims.familyId)) {
      throw new ErreurJwt('Refresh token révoqué');
    }
    return claims;
  }

  /** Consomme un refresh token et en émet un nouveau de même famille. */
  rotateRefreshToken(token: string): JetonSigne<ReturnType<typeof zRefreshTokenClaims.parse>> {
    const claims = this.strategy.verifyRefreshToken(token);
    if (!this.revokedStore.consume(claims.jti, claims.familyId)) {
      this.revokedStore.revokeFamily(claims.familyId);
      throw new ErreurJwt('Refresh token déjà utilisé');
    }
    const maintenant = Math.floor(Date.now() / 1000);
    const nouveau = zRefreshTokenClaims.parse({
      ...claims,
      jti: randomUUID(),
      iat: maintenant,
      nbf: maintenant,
      exp: maintenant + this.config.refreshTtlSeconds,
    });
    return { token: this.signer(nouveau), claims: nouveau };
  }

  /** Signe une charge utile JWT avec la clé privée active. */
  private signer(claims: object): string {
    const entete = { alg: 'RS256', typ: 'JWT', kid: this.config.activeKeyId };
    const enteteBase64 = Buffer.from(JSON.stringify(entete)).toString('base64url');
    const chargeBase64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signataire = createSign('RSA-SHA256');
    signataire.update(`${enteteBase64}.${chargeBase64}`);
    const signature = signataire
      .sign(lireClePem(this.config, this.config.activeKeyId, 'private'))
      .toString('base64url');
    return `${enteteBase64}.${chargeBase64}.${signature}`;
  }
}
