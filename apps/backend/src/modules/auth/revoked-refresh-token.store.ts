// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@nestjs/common';

/** Persistance des jetons de rafraîchissement consommés ou révoqués. */
export interface RevokedRefreshTokenStore {
  consume(jti: string, familyId: string): boolean;
  revokeFamily(familyId: string): void;
  isRevoked(jti: string, familyId: string): boolean;
}

/**
 * Store en mémoire destiné aux tests et à la démonstration.
 *
 * Le stockage persistant des refresh tokens appartient à TAKT-L03-03 ; cette
 * implémentation isole ici la sémantique de rotation et de rejeu.
 */
@Injectable()
export class InMemoryRevokedRefreshTokenStore implements RevokedRefreshTokenStore {
  private readonly jtisConsommes = new Set<string>();
  private readonly famillesRevoquees = new Set<string>();

  consume(jti: string, familyId: string): boolean {
    if (this.jtisConsommes.has(jti) || this.famillesRevoquees.has(familyId)) {
      this.revokeFamily(familyId);
      return false;
    }
    this.jtisConsommes.add(jti);
    return true;
  }

  revokeFamily(familyId: string): void {
    this.famillesRevoquees.add(familyId);
  }

  isRevoked(jti: string, familyId: string): boolean {
    return this.jtisConsommes.has(jti) || this.famillesRevoquees.has(familyId);
  }
}
