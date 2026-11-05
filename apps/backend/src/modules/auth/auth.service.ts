// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { PasswordService } from './password.service';
import { TokenService, IdentiteAccessToken } from './token.service';
import { SessionRefreshStore } from './session-refresh.store';
import {
  ApiError,
  CODES_ERREUR_API,
} from '../common/http/api-error';
import { AuditService } from '../audit/audit.service';

/** Message unique renvoyé pour tout échec d'authentification (pas d'énumération). */
const MESSAGE_ECHEC_AUTH = 'Identifiants invalides';

/**
 * Service d'authentification : connexion, rafraîchissement et déconnexion.
 *
 * Gère la vérification des identifiants (argon2id), l'émission des jetons
 * (access RS256 + refresh rotatif), la persistance des familles de jetons et
 * le journal d'audit de chaque mutation (GG-07).
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Rate limiting en mémoire : clé = `${ip}:${email}`, fenêtre glissante 15 min,
  // maximum 5 échecs. Réinitialisé à chaque succès.
  private readonly echecsParCle = new Map<string, number[]>();
  private readonly MAX_ECHECS = 5;
  private readonly FENETRE_MS = 15 * 60 * 1000;

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(SessionRefreshStore) private readonly sessionStore: SessionRefreshStore,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Connexion : vérifie les identifiants et émet les deux jetons. */
  async login(
    email: string,
    motDePasse: string,
    ip: string,
  ): Promise<{
    utilisateur: {
      id: string;
      email: string;
      nom: string;
      prenom: string;
      role: string;
      departementId: string | null;
      estActif: boolean;
    };
    accessToken: string;
    refreshToken: string;
  }> {
    const cle = `${ip}:${email}`;
    const maintenant = Date.now();

    // Rate limiting : rejet préventif si trop d'échecs récents sur cette clé.
    const horodatages =
      (this.echecsParCle.get(cle) ?? []).filter(
        (t) => maintenant - t < this.FENETRE_MS,
      );
    if (horodatages.length >= this.MAX_ECHECS) {
      throw new ApiError(
        CODES_ERREUR_API.TOO_MANY_REQUESTS,
        429,
        'Trop de tentatives de connexion, réessayez plus tard',
      );
    }

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email },
      include: { role: { select: { code: true } } },
    });

    const motDePasseValide =
      !!utilisateur &&
      !!utilisateur.motDePasseHash &&
      (await this.passwordService.verify(utilisateur.motDePasseHash, motDePasse));

    const compteActif = !!utilisateur?.estActif;

    if (!motDePasseValide || !compteActif) {
      // Un même message quelle que soit la cause : pas d'énumération de comptes.
      this.echecsParCle.set(cle, [...horodatages, maintenant]);
      this.logger.warn(
        `Tentative de connexion échouée pour ${email} depuis ${ip}`,
      );
      throw new ApiError(CODES_ERREUR_API.UNAUTHORIZED, 401, MESSAGE_ECHEC_AUTH);
    }

    // Succès : réinitialise le compteur d'échecs.
    this.echecsParCle.delete(cle);

    const maintenantSec = Math.floor(Date.now() / 1000);
    const identite: IdentiteAccessToken = {
      sub: utilisateur.id,
      role: (utilisateur.role?.code ??
        'gest') as IdentiteAccessToken['role'],
      departementIds: utilisateur.departementId
        ? [utilisateur.departementId]
        : [],
    };

    const access = this.tokenService.signAccessToken(identite);
    const refresh = this.tokenService.signRefreshToken(utilisateur.id);
    const expiresAt = new Date(
      maintenantSec + this.tokenService.refreshTtlSeconds * 1000,
    );

    // Persistance de la famille de rafraîchissement (nouveau jti).
    await this.sessionStore.creerSession(
      refresh.claims.jti,
      refresh.claims.familyId,
      utilisateur.id,
      expiresAt,
    );

    // Journal d'audit (GG-07) : pas de mot de passe ni de hash dans les métadonnées.
    await this.auditService.record({
      action: 'LOGIN',
      utilisateurId: utilisateur.id,
      entite: 'Utilisateur',
      entiteId: utilisateur.id,
      metadonnees: { email: utilisateur.email, ip },
    });

    return {
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        role: utilisateur.role?.code ?? utilisateur.roleId,
        departementId: utilisateur.departementId,
        estActif: utilisateur.estActif,
      },
      accessToken: access.token,
      refreshToken: refresh.token,
    };
  }

  /** Rafraîchissement : vérifie, consomme l'ancien jeton et en émet un nouveau. */
  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const claims = await this.tokenService.verifyRefreshToken(refreshToken);
    const rotation = await this.tokenService.rotateRefreshToken(refreshToken);

    const maintenantSec = Math.floor(Date.now() / 1000);
    const expiresAt = new Date(
      maintenantSec + this.tokenService.refreshTtlSeconds * 1000,
    );

    // Remplace l'ancien jti par le nouveau dans la même famille.
    await this.sessionStore.creerSession(
      rotation.claims.jti,
      rotation.claims.familyId,
      claims.sub,
      expiresAt,
    );

    // Reconstruit l'identité d'accès depuis l'utilisateur en base.
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id: claims.sub },
      select: { id: true, role: { select: { code: true } }, departementId: true },
    });
    const identite: IdentiteAccessToken = {
      sub: claims.sub,
      role: (utilisateur?.role?.code ?? 'gest') as IdentiteAccessToken['role'],
      departementIds: utilisateur?.departementId
        ? [utilisateur.departementId]
        : [],
    };
    const access = this.tokenService.signAccessToken(identite);

    await this.auditService.record({
      action: 'REFRESH',
      utilisateurId: claims.sub,
      entite: 'Utilisateur',
      entiteId: claims.sub,
      metadonnees: {
        jti: rotation.claims.jti,
        familyId: rotation.claims.familyId,
      },
    });

    return { accessToken: access.token, refreshToken: rotation.token };
  }

  /** Déconnexion : révoque toute la famille de rafraîchissement. */
  async logout(refreshToken: string): Promise<void> {
    const claims = await this.tokenService.verifyRefreshToken(refreshToken);
    await this.sessionStore.revokeFamily(claims.familyId);

    await this.auditService.record({
      action: 'LOGOUT',
      utilisateurId: claims.sub,
      entite: 'Utilisateur',
      entiteId: claims.sub,
      metadonnees: { familyId: claims.familyId },
    });
  }
}