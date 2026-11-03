// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { createVerify } from 'node:crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { zAccessTokenClaims, zRefreshTokenClaims } from '@takt/contracts';
import { AuthConfig, lireClePem } from '../../config/auth.config';

/** En-tête JWT vérifié strictement avant toute opération cryptographique. */
interface EnteteJwt {
  alg: 'RS256';
  typ: 'JWT';
  kid: string;
}

/** Erreur applicative de validation JWT, volontairement sans détail du jeton. */
export class ErreurJwt extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNAUTHORIZED);
    this.name = 'ErreurJwt';
  }
}

/** Stratégie de validation RS256 des access tokens. */
export class JwtStrategy {
  constructor(private readonly config: AuthConfig) {}

  /** Vérifie la signature et les claims d'un access token. */
  verifyAccessToken(token: string): ReturnType<typeof zAccessTokenClaims.parse> {
    const { entete, charge, signature, enteteBase64, chargeBase64 } = this.decouper(token);
    this.validerEnTete(entete);
    this.validerSignature(entete, signature, `${enteteBase64}.${chargeBase64}`);

    const claims = zAccessTokenClaims.safeParse(charge);
    if (!claims.success) {
      throw new ErreurJwt('Claims JWT invalides');
    }
    const maintenant = Math.floor(Date.now() / 1000);
    if (claims.data.exp <= maintenant) {
      throw new ErreurJwt('Jeton JWT expiré');
    }
    if (claims.data.nbf > maintenant) {
      throw new ErreurJwt('Jeton JWT non actif');
    }
    if (claims.data.iss !== this.config.issuer || claims.data.aud !== this.config.audience) {
      throw new ErreurJwt('Émetteur ou audience JWT invalide');
    }
    return claims.data;
  }

  /** Vérifie la signature et les claims d'un refresh token. */
  verifyRefreshToken(token: string): ReturnType<typeof zRefreshTokenClaims.parse> {
    const { entete, charge, signature, enteteBase64, chargeBase64 } = this.decouper(token);
    this.validerEnTete(entete);
    this.validerSignature(entete, signature, `${enteteBase64}.${chargeBase64}`);

    const claims = zRefreshTokenClaims.safeParse(charge);
    if (!claims.success) {
      throw new ErreurJwt('Claims JWT invalides');
    }
    const maintenant = Math.floor(Date.now() / 1000);
    if (claims.data.exp <= maintenant) {
      throw new ErreurJwt('Jeton JWT expiré');
    }
    if (claims.data.nbf > maintenant) {
      throw new ErreurJwt('Jeton JWT non actif');
    }
    if (claims.data.iss !== this.config.issuer || claims.data.aud !== this.config.audience) {
      throw new ErreurJwt('Émetteur ou audience JWT invalide');
    }
    return claims.data;
  }

  /** Découpe et décode un JWT sans accepter de structure inattendue. */
  private decouper(token: string): {
    entete: EnteteJwt;
    charge: unknown;
    signature: string;
    enteteBase64: string;
    chargeBase64: string;
  } {
    const [enteteBase64, chargeBase64, signature] = token.split('.');
    if (!enteteBase64 || !chargeBase64 || signature === undefined) {
      throw new ErreurJwt('Format JWT invalide');
    }
    try {
      const entete = JSON.parse(
        Buffer.from(enteteBase64, 'base64url').toString('utf8'),
      ) as EnteteJwt;
      const charge: unknown = JSON.parse(Buffer.from(chargeBase64, 'base64url').toString('utf8'));
      return {
        entete,
        charge,
        signature,
        enteteBase64,
        chargeBase64,
      };
    } catch {
      throw new ErreurJwt('Format JWT invalide');
    }
  }

  /** Vérifie l'algorithme, le type et l'identité de clé. */
  private validerEnTete(entete: EnteteJwt): void {
    if (entete.alg !== 'RS256' || entete.typ !== 'JWT') {
      throw new ErreurJwt('Algorithme JWT non autorisé');
    }
    const clesAutorisees = [this.config.activeKeyId, ...this.config.previousKeyIds];
    if (!clesAutorisees.includes(entete.kid)) {
      throw new ErreurJwt('Clé JWT inconnue');
    }
  }

  /** Vérifie une signature RS256 sur les segments JWT originaux. */
  private validerSignature(entete: EnteteJwt, signature: string, donnees: string): void {
    const clePublique = lireClePem(this.config, entete.kid, 'public');
    const verificateur = createVerify('RSA-SHA256');
    verificateur.update(donnees);
    if (!verificateur.verify(clePublique, signature, 'base64url')) {
      throw new ErreurJwt('Signature JWT invalide');
    }
  }

  /** Encode une chaîne ou un objet JSON en base64url. */
  encodageBase64Url(valeur: string | object): string {
    return Buffer.from(typeof valeur === 'string' ? valeur : JSON.stringify(valeur)).toString(
      'base64url',
    );
  }
}
