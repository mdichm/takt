// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthConfig, chargerConfigAuth } from '../../config/auth.config';
import { PasswordService } from './password.service';
import { InMemoryRevokedRefreshTokenStore } from './revoked-refresh-token.store';
import { TokenService } from './token.service';

/** Module regroupant les services de sécurité de l'authentification. */
@Module({
  providers: [
    PasswordService,
    InMemoryRevokedRefreshTokenStore,
    {
      provide: TokenService,
      inject: [ConfigService, InMemoryRevokedRefreshTokenStore],
      useFactory: (
        config: ConfigService,
        revokedStore: InMemoryRevokedRefreshTokenStore,
      ): TokenService => {
        const authConfig: AuthConfig = chargerConfigAuth({
          JWT_KEYS_DIRECTORY: config.get<string>('JWT_KEYS_DIRECTORY', '/run/secrets/jwt'),
          JWT_ACTIVE_KEY_ID: config.get<string>('JWT_ACTIVE_KEY_ID', 'active'),
          JWT_PREVIOUS_KEY_IDS: config.get<string>('JWT_PREVIOUS_KEY_IDS', ''),
          JWT_ISSUER: config.get<string>('JWT_ISSUER', 'takt'),
          JWT_AUDIENCE: config.get<string>('JWT_AUDIENCE', 'takt-api'),
          JWT_ACCESS_TTL: config.get<string>('JWT_ACCESS_TTL', '15m'),
          JWT_REFRESH_TTL: config.get<string>('JWT_REFRESH_TTL', '7d'),
        });
        return new TokenService(authConfig, revokedStore);
      },
    },
  ],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
