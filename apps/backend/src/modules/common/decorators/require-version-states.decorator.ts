// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { SetMetadata } from '@nestjs/common';
import { EtatVersion } from '@takt/contracts';

/**
 * Clé de métadonnée NestJS stockant les états de version autorisés sur un endpoint.
 */
export const VERSION_STATES_KEY = 'versionStates';

/**
 * Décorateur déclaratif : restreint l'accès à un endpoint aux états de version spécifiés.
 *
 * @param etats — liste des états de version autorisés (ex: 'edition', 'valid_pedag')
 */
export const RequireVersionStates = (...etats: EtatVersion[]) =>
  SetMetadata(VERSION_STATES_KEY, etats);
