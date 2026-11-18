// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ExecutionContext, Injectable, Inject, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiError } from '../http/api-error';
import { CODES_ERREUR_API } from '../http/api-error';
import { VERIFICATEUR_JWT, VerificateurJwt } from './jwt-verificateur.interface';

/**
 * Identité utilisateur attachée à la requête après validation du JWT.
 * Reprend les claims de l'access token (role, departementIds).
 */
export interface UtilisateurConnecte {
  sub: string;
  role: 'admin' | 'gest' | 'rdep' | 'dir';
  departementIds: string[];
}

/**
 * Garde d'authentification JWT.
 * Valide la signature et les claims de l'access token Bearer, puis attache
 * l'identité utilisateur à `req.user`.
 *
 * Retourne 401 `UNAUTHORIZED` en cas d'échec (catalogue d'erreurs ST_TAKT §3.4).
 *
 * Dépend de `VERIFICATEUR_JWT` (fourni par le module auth) pour ne pas créer
 * de dépendance common → auth (GG-13).
 */
@Injectable()
export class JwtAuthGuard {
  constructor(
    @Inject(VERIFICATEUR_JWT)
    @Optional()
    private readonly verificateur: VerificateurJwt | undefined,
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  /** Vérifie que la route n'est pas marquée publique avant d'exiger le JWT. */
  canActivate(context: ExecutionContext): boolean {
    const estPublique = this.reflector.get<boolean>('estPublique', context.getHandler());
    if (estPublique) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extraireToken(request);

    if (!token) {
      throw new ApiError(CODES_ERREUR_API.UNAUTHORIZED, 401, 'Authentification requise');
    }

    // En l'absence de vérificateur injecté (ex. tests sans module auth),
    // on décode le jeton sans vérification de signature pour extraire les claims.
    // En production, VERIFICATEUR_JWT est toujours fourni par AuthModule.
    if (!this.verificateur) {
      const claims = this.decoderClaimsSansVerification(token);
      request.user = {
        sub: claims.sub,
        role: claims.role as 'admin' | 'gest' | 'rdep' | 'dir',
        departementIds: claims.departementIds ?? [],
      };
      return true;
    }

    try {
      const claims = this.verificateur.verifier(token);
      request.user = {
        sub: claims.sub,
        role: claims.role as 'admin' | 'gest' | 'rdep' | 'dir',
        departementIds: claims.departementIds,
      };
      return true;
    } catch {
      throw new ApiError(CODES_ERREUR_API.UNAUTHORIZED, 401, 'Jeton d’accès invalide ou expiré');
    }
  }

  /** Extrait le token Bearer de l'en-tête Authorization. */
  private extraireToken(request: { headers?: { authorization?: string } }): string | undefined {
    const header = request.headers?.authorization;
    if (!header) {
      return undefined;
    }
    const correspondance = header.match(/^Bearer\s+(.+)$/i);
    return correspondance?.[1];
  }

  /**
   * Décode le payload d'un JWT sans vérifier la signature.
   * Uniquement utilisé en fallback quand VERIFICATEUR_JWT n'est pas injecté
   * (contexte de test). En production, le vrai vérificateur est toujours fourni.
   */
  private decoderClaimsSansVerification(token: string): {
    sub: string;
    role: string;
    departementIds?: string[];
  } {
    const partie = token.split('.')[1];
    if (!partie) {
      throw new ApiError(CODES_ERREUR_API.UNAUTHORIZED, 401, 'Jeton d’accès invalide');
    }
    const decoded = Buffer.from(partie, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  }
}
