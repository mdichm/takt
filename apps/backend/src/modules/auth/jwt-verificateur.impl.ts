// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@nestjs/common';
import { VerificateurJwt, VERIFICATEUR_JWT } from '../common/guards/jwt-verificateur.interface';
import { TokenService } from './token.service';
import { zAccessTokenClaims } from '@takt/contracts';

/**
 * Implémentation concrète de VerificateurJwt utilisant TokenService.
 * Fournie par le module auth afin que common n'ait pas à importer auth (GG-13).
 */
@Injectable()
export class JwtVerificateurImpl implements VerificateurJwt {
  constructor(private readonly tokenService: TokenService) {}

  verifier(token: string): ReturnType<typeof zAccessTokenClaims.parse> {
    return this.tokenService.verifyAccessToken(token);
  }
}

/**
 * Provider liant le jeton d'injection VERIFICATEUR_JWT à l'implémentation concrète.
 */
export const verificateurJwtProvider = {
  provide: VERIFICATEUR_JWT,
  useClass: JwtVerificateurImpl,
};
