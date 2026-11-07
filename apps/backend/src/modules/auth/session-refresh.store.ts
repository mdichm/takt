// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { RevokedRefreshTokenStore } from './revoked-refresh-token.store';

/**
 * Stockage persistant des familles de jetons de rafraîchissement (table
 * `SessionRefresh`).
 *
 * Sémantique de rotation : un jti est « consommé » lorsqu'il est présenté pour
 * rafraîchir ; son enregistrement est alors supprimé et un nouvel enregistrement
 * (nouveau jti, même famille) est créé par l'appelant. Tout rejeu d'un jti
 * absent ou déjà consommé est donc rejeté et la famille est révoquée.
 *
 * L'accès à Prisma passe par le jeton d'injection `PRISMA` (fournie par
 * `CommonModule`), sans import relatif du sous-module Prisma (règle
 * d'architecture des modules).
 */
@Injectable()
export class SessionRefreshStore implements RevokedRefreshTokenStore {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Marque un jti comme consommé (suppression) et autorise la rotation. */
  async consume(jti: string, familyId: string): Promise<boolean> {
    const session = await this.prisma.sessionRefresh.findUnique({
      where: { jti },
    });

    if (!session || session.estRevoque || session.familyId !== familyId) {
      await this.revokeFamily(familyId);
      return false;
    }

    // Consommation : le jti ne peut plus être représenté.
    await this.prisma.sessionRefresh.delete({ where: { jti } });
    return true;
  }

  /** Révoque toute une famille de jetons (ex: logout, rejet de rejeu). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.sessionRefresh.updateMany({
      where: { familyId },
      data: { estRevoque: true },
    });
  }

  /** Indique si un jti est révoqué, inconnu ou appartient à une autre famille. */
  async isRevoked(jti: string, familyId: string): Promise<boolean> {
    const session = await this.prisma.sessionRefresh.findUnique({
      where: { jti },
    });
    if (!session) {
      return true;
    }
    return session.estRevoque || session.familyId !== familyId;
  }

  /** Crée l'enregistrement d'un nouveau jti (appelé après login ou rotation). */
  async creerSession(
    jti: string,
    familyId: string,
    utilisateurId: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.sessionRefresh.create({
      data: { jti, familyId, utilisateurId, expiresAt },
    });
  }

  /** Purge les sessions expirées (maintenance, non critique pour la sécurité). */
  async purgerSessionsExpirees(): Promise<void> {
    await this.prisma.sessionRefresh.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
