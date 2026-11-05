// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiError } from '../http/api-error';
import { CODES_ERREUR_API } from '../http/api-error';
import { UtilisateurConnecte } from './jwt-auth.guard';

/**
 * Clé de métadonnée indiquant qu'un endpoint nécessite une portée par département.
 */
export const DEPARTMENT_SCOPE_KEY = 'departmentScope';

/**
 * Guard de portée par département.
 * Vérifie que l'utilisateur connecté possède un département valide quand le
 * décorateur @DepartmentScope() est présent sur l'endpoint.
 *
 * Stocke `req.departementIds` pour permettre aux services d'appliquer le
 * filtrage Prisma en base de données.
 *
 * - `admin` / `dir` : aucun filtrage (départementIds vide = tous)
 * - `rdep` : seul son département est autorisé
 * - Retourne 403 `FORBIDDEN` si l'utilisateur n'a pas de département et que le
 *   scope est requis.
 */
@Injectable()
export class DepartmentScopeGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.reflector) {
      return true;
    }
    const requis =
      this.reflector.get<boolean>(
        DEPARTMENT_SCOPE_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<boolean>(DEPARTMENT_SCOPE_KEY, context.getClass());

    if (!requis) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const utilisateur = request.user as UtilisateurConnecte | undefined;

    if (!utilisateur) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Utilisateur non authentifié',
      );
    }

    const departementIds = utilisateur.departementIds ?? [];

    // admin et dir n'ont pas de département restreint (tableau vide = tous)
    if (
      (utilisateur.role === 'admin' || utilisateur.role === 'dir') &&
      departementIds.length === 0
    ) {
      request.departementIds = [];
      return true;
    }

    // rdep doit avoir au moins un département
    if (utilisateur.role === 'rdep' && departementIds.length === 0) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Aucun département associé à cet utilisateur',
      );
    }

    request.departementIds = departementIds;
    return true;
  }
}
