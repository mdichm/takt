// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Body, Controller, Inject, Post, Req, Res, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { zLogin, zRefreshCookie, LoginInput, RefreshCookieInput } from '@takt/contracts';
import { ZodValidation } from '../common/pipes/zod-validation.decorator';
import { AuthService } from './auth.service';

/** Nom du cookie portant le jeton de rafraîchissement (HttpOnly). */
const COOKIE_REFRESH_TOKEN = 'refreshToken';

/**
 * Type de substitution pour @Req() afin que TypeScript émette des métadonnées
 * PARAMTYPES_METADATA (requis par @nestjs/swagger). Cette classe n'est pas
 * exposée dans OpenAPI (cachée via @ApiHideParameter).
 */
class ExpressRequestHolder {}

/**
 * Type de substitution pour @Res() afin que TypeScript émette des métadonnées
 * PARAMTYPES_METADATA (requis par @nestjs/swagger). Cette classe n'est pas
 * exposée dans OpenAPI (cachée via @ApiHideParameter).
 */
class ExpressResponseHolder {}

/**
 * Extrait le jeton de rafraîchissement depuis le cookie `refreshToken`.
 * Aucun `cookie-parser` n'est ajouté (pas de nouvelle dépendance, GG-02) :
 * l'en-tête `Cookie` est parsé manuellement.
 */
function extraireRefreshToken(req: ExpressRequestHolder): string | undefined {
  const cookieHeader = (req as { headers?: { cookie?: string } }).headers?.cookie;
  if (!cookieHeader) {
    return undefined;
  }
  const valeurs = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const valeur of valeurs) {
    const correspondance = valeur.match(/(?:^|;\s*)refreshToken=([^;]*)/);
    if (correspondance?.[1]) {
      return correspondance[1];
    }
  }
  return undefined;
}

/**
 * Contrôleur d'authentification : `POST /auth/login`, `/auth/refresh`,
 * `/auth/logout`.
 *
 * Les jetons de rafraîchissement sont transmis dans un cookie
 * `HttpOnly; Secure; SameSite=Strict` afin qu'ils ne soient jamais exposés
 * au JavaScript du navigateur (GG-17). Le corps de réponse ne contient jamais
 * le refresh token.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zLogin })
  @ApiOperation({ summary: 'Connexion utilisateur (émet access + refresh)' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives' })
  async login(
    @Body() corps: LoginInput,
    @Req() req: ExpressRequestHolder,
    @Res({ passthrough: true }) res: ExpressResponseHolder,
  ) {
    // any-justify: req/res sont les objets Express natifs injectés par NestJS,
    // typés par des classes de substitution pour Swagger (cast au besoin).
    const ip = (req as { ip?: string }).ip ?? 'inconnu';
    const resultat = await this.authService.login(corps.email, corps.motDePasse, ip);

    (res as { cookie: (nom: string, valeur: string, options: { httpOnly: boolean; secure: boolean; sameSite: string; path: string }) => void }).cookie(
      COOKIE_REFRESH_TOKEN,
      resultat.refreshToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      },
    );

    return { accessToken: resultat.accessToken, utilisateur: resultat.utilisateur };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zRefreshCookie })
  @ApiOperation({ summary: 'Rafraîchit les jetons (rotation du refresh)' })
  @ApiResponse({ status: 200, description: 'Jeton rafraîchi' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide ou révoqué' })
  async refresh(
    @Body() corps: RefreshCookieInput,
    @Req() req: ExpressRequestHolder,
    @Res({ passthrough: true }) res: ExpressResponseHolder,
  ) {
    // any-justify: idem.
    const refreshToken = extraireRefreshToken(req) ?? corps.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED' });
    }
    const resultat = await this.authService.refresh(refreshToken);

    (res as { cookie: (nom: string, valeur: string, options: { httpOnly: boolean; secure: boolean; sameSite: string; path: string }) => void }).cookie(
      COOKIE_REFRESH_TOKEN,
      resultat.refreshToken,
      {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      },
    );

    return { accessToken: resultat.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ body: zRefreshCookie })
  @ApiOperation({ summary: 'Déconnexion (révoque la famille de rafraîchissement)' })
  @ApiResponse({ status: 200, description: 'Déconnecté' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide' })
  async logout(
    @Body() corps: RefreshCookieInput,
    @Req() req: ExpressRequestHolder,
    @Res({ passthrough: true }) res: ExpressResponseHolder,
  ) {
    // any-justify: idem.
    const refreshToken = extraireRefreshToken(req) ?? corps.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED' });
    }
    await this.authService.logout(refreshToken);

    // Efface le cookie côté client.
    (res as { clearCookie: (nom: string, options: { path: string }) => void }).clearCookie(COOKIE_REFRESH_TOKEN, { path: '/' });

    return {};
  }
}
