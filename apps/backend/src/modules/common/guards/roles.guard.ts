// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '@takt/contracts';
import { ApiError } from '../http/api-error';
import { CODES_ERREUR_API } from '../http/api-error';
import { UtilisateurConnecte } from './jwt-auth.guard';

/**
 * Clé de métadonnée stockant les rôles autorisés (mise en commun avec le décorateur).
 */
export const ROLES_KEY = 'roles';

/**
 * Guard RBAC : vérifie que le rôle de l'utilisateur connecté figure parmi les
 * rôles autorisés par le décorateur @Roles().
 *
 * Retourne 403 `FORBIDDEN` (jamais 404) si l'utilisateur n'a pas le rôle requis.
 * Si aucun métadonnée @Roles n'est présente sur la route, l'accès est autorisé
 * (route publique ou déjà protégée par un autre mécanisme).
 */
@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.reflector) {
      return true;
    }
    const rolesAutorises =
      this.reflector.get<RoleCode[]>(ROLES_KEY, context.getHandler()) ??
      this.reflector.get<RoleCode[]>(ROLES_KEY, context.getClass());

    // Aucune contrainte de rôle sur cette route → accès autorisé
    if (!rolesAutorises || rolesAutorises.length === 0) {
      return true;
    }

    const utilisateur = context.switchToHttp().getRequest<{ user?: UtilisateurConnecte }>().user;

    if (!utilisateur) {
      throw new ApiError(CODES_ERREUR_API.FORBIDDEN, 403, 'Utilisateur non authentifié');
    }

    const aAutorisation = rolesAutorises.includes(utilisateur.role);
    if (!aAutorisation) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Rôle insuffisant pour accéder à cette ressource',
        { rolesAutorises, roleUtilisateur: utilisateur.role },
      );
    }

    return true;
  }
}
