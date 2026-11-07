// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EtatVersion } from '@takt/contracts';
import { ApiError } from '../http/api-error';
import { CODES_ERREUR_API } from '../http/api-error';

/**
 * Clé de métadonnée stockant les états de version autorisés.
 */
export const VERSION_STATES_KEY = 'versionStates';

/**
 * Guard d'état de version.
 * Vérifie que l'état courant de la version figure parmi les états autorisés
 * par le décorateur @RequireVersionStates().
 *
 * Retourne 403 `FORBIDDEN` si l'état de version n'est pas autorisé.
 */
@Injectable()
export class VersionStateGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const etatsAutorises =
      this.reflector.get<EtatVersion[]>(
        VERSION_STATES_KEY,
        context.getHandler(),
      ) ??
      this.reflector.get<EtatVersion[]>(VERSION_STATES_KEY, context.getClass());

    if (!etatsAutorises || etatsAutorises.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      etatVersionCourant?: EtatVersion;
    }>();

    const etatCourant = request.etatVersionCourant;
    if (!etatCourant) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'État de version non déterminé',
      );
    }

    const aAutorisation = etatsAutorises.includes(etatCourant);
    if (!aAutorisation) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Transition non autorisée pour cet état de version',
        { etatCourant, etatsAutorises },
      );
    }

    return true;
  }
}
