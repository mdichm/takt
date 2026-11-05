// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { SetMetadata } from '@nestjs/common';
import { RoleCode } from '@takt/contracts';

/**
 * Clé de métadonnée NestJS stockant les rôles autorisés sur un endpoint.
 */
export const ROLES_KEY = 'roles';

/**
 * Décorateur déclaratif : restreint l'accès à un endpoint aux rôles spécifiés.
 *
 * @param roles — liste des codes de rôle autorisés (ex: 'admin', 'gest')
 */
export const Roles = (...roles: RoleCode[]) => SetMetadata(ROLES_KEY, roles);
