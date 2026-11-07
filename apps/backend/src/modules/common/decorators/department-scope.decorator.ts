// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { SetMetadata } from '@nestjs/common';

/**
 * Clé de métadonnée NestJS indiquant qu'un endpoint nécessite une portée par département.
 */
export const DEPARTMENT_SCOPE_KEY = 'departmentScope';

/**
 * Décorateur déclaratif : marque un endpoint comme nécessitant une portée par département.
 * Le DepartmentScopeGuard vérifiera ensuite que l'utilisateur possède un département
 * valide et filtrera les données en conséquence.
 */
export const DepartmentScope = () => SetMetadata(DEPARTMENT_SCOPE_KEY, true);
