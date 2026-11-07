// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { CanActivate, ExecutionContext, Inject, Injectable, Scope } from '@nestjs/common';
import { AccessTokenClaims } from '@takt/contracts';
import { ApiError, CODES_ERREUR_API } from '../common/http/api-error';
import { TokenService } from '../auth/token.service';

/** Requête HTTP enrichie par le guard SSE. */
interface RequeteEvenements {
  headers: { authorization?: string };
  query: { access_token?: string };
  utilisateur?: AccessTokenClaims;
}

/** Authentifie les clients SSE avec un access token uniquement. */
@Injectable({ scope: Scope.REQUEST })
export class EventsGuard implements CanActivate {
  constructor(@Inject(TokenService) private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const requete = context.switchToHttp().getRequest<RequeteEvenements>();
    const token = this.extraireToken(requete);
    if (!token) {
      throw new ApiError(CODES_ERREUR_API.UNAUTHORIZED, 401, 'Jeton d’accès requis');
    }
    try {
      const claims = this.tokenService.verifyAccessToken(token);
      requete.utilisateur = claims;
      return true;
    } catch {
      throw new ApiError(CODES_ERREUR_API.UNAUTHORIZED, 401, 'Jeton d’accès invalide');
    }
  }

  /** Extrait le bearer header ou le paramètre EventSource. */
  private extraireToken(requete: RequeteEvenements): string | undefined {
    const authorization = requete.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim() || undefined;
    }
    return requete.query.access_token?.trim() || undefined;
  }
}
