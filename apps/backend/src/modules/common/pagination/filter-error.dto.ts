// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiProperty } from '@nestjs/swagger';
import { DetailValidationDto } from '../dto/api-envelope.dto';

/** Erreur renvoyée lorsqu'un filtre ou un tri est interdit. */
export class FilterErrorDto {
  @ApiProperty({ description: 'Code métier de la réponse', example: 'VALIDATION_ERROR' })
  code!: 'VALIDATION_ERROR';

  @ApiProperty({ description: "Message d'erreur destiné au client" })
  message!: string;

  @ApiProperty({ description: 'Détails du filtre refusé', type: [DetailValidationDto] })
  details!: DetailValidationDto[];
}
