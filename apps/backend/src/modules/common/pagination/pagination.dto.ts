// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiPropertyOptional } from '@nestjs/swagger';

/** Paramètres de pagination communs aux endpoints de liste. */
export class PaginationDto {
  @ApiPropertyOptional({ description: 'Page demandée', minimum: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({
    description: "Nombre d'éléments par page",
    minimum: 1,
    maximum: 200,
    default: 20,
  })
  pageSize?: number;
}
