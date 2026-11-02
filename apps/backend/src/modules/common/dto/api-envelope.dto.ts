// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CodeErreurApi } from '../http/api-error';

/** Métadonnées communes de l'enveloppe API. */
export class MetaApiDto {
  @ApiProperty({ description: 'Identifiant de corrélation de la requête' })
  requestId!: string;

  @ApiProperty({ description: 'Horodatage ISO 8601 de la réponse' })
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Page courante', minimum: 1 })
  page?: number;

  @ApiPropertyOptional({ description: 'Taille de page', minimum: 1 })
  pageSize?: number;

  @ApiPropertyOptional({ description: "Nombre total d'éléments", minimum: 0 })
  total?: number;
}

/** Détail structuré d'une erreur de validation. */
export class DetailValidationDto {
  @ApiProperty({ description: 'Champ concerné par la validation' })
  champ!: string;

  @ApiProperty({ description: "Message d'erreur destiné au client" })
  message!: string;
}

/** Corps d'une erreur API, limité au catalogue ST_TAKT §3.4. */
export class ErreurApiDto {
  @ApiProperty({
    description: 'Code métier de la réponse',
    type: 'string',
    enum: [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'WORKFLOW_INVALID_TRANSITION',
      'SEANCE_LOCKED',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ],
  })
  code!: CodeErreurApi;

  @ApiPropertyOptional({ description: 'Message destiné au client' })
  message?: string;

  @ApiPropertyOptional({
    description: 'Détails structurés de validation',
    type: [DetailValidationDto],
  })
  details?: DetailValidationDto[];
}

/** Enveloppe unique de l'API. */
export class EnveloppeApiDto<T = unknown> {
  @ApiProperty({ description: 'Données métier ; null en cas d’erreur' })
  data!: T | null;

  @ApiProperty({
    description: 'Erreur ; null en cas de succès',
    type: ErreurApiDto,
    nullable: true,
  })
  error!: ErreurApiDto | null;

  @ApiProperty({ description: 'Métadonnées de la réponse', type: MetaApiDto })
  meta!: MetaApiDto;
}
