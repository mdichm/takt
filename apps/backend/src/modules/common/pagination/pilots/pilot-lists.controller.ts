// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  SeanceListFilters,
  UserListFilters,
  VersionListFilters,
  zSeanceList,
  zUserList,
  zVersionList,
} from '@takt/contracts';
import { DonneesPaginees } from '../../http/api-envelope';
import { ZodQueryPipe } from '../../pipes/zod-validation.pipe';
import { ErreurFiltreListe } from '../build-prisma-query';
import { FilterErrorDto } from '../filter-error.dto';
import { PilotListsService } from './pilot-lists.service';

@ApiTags('Pilotes techniques de listes')
@Controller('pilotes')
export class PilotListsController {
  constructor(@Inject(PilotListsService) private readonly service: PilotListsService) {}

  @Get('users')
  @ApiOperation({ summary: 'Liste paginée des utilisateurs (pilote technique)' })
  @ApiOkResponse({ description: 'Page normalisée des utilisateurs' })
  @ApiBadRequestResponse({ description: 'Filtre ou tri invalide', type: FilterErrorDto })
  utilisateurs(
    @Query(new ZodQueryPipe(zUserList)) query: UserListFilters,
  ): Promise<DonneesPaginees<unknown>> {
    return this.executer(() => this.service.utilisateurs(query));
  }

  @Get('versions')
  @ApiOperation({ summary: 'Liste paginée des versions (pilote technique)' })
  @ApiOkResponse({ description: 'Page normalisée des versions' })
  @ApiBadRequestResponse({ description: 'Filtre ou tri invalide', type: FilterErrorDto })
  versions(
    @Query(new ZodQueryPipe(zVersionList)) query: VersionListFilters,
  ): Promise<DonneesPaginees<unknown>> {
    return this.executer(() => this.service.versions(query));
  }

  @Get('seances')
  @ApiOperation({ summary: 'Liste paginée des séances (pilote technique)' })
  @ApiOkResponse({ description: 'Page normalisée des séances' })
  @ApiBadRequestResponse({ description: 'Filtre ou tri invalide', type: FilterErrorDto })
  seances(
    @Query(new ZodQueryPipe(zSeanceList)) query: SeanceListFilters,
  ): Promise<DonneesPaginees<unknown>> {
    return this.executer(() => this.service.seances(query));
  }

  private async executer(
    action: () => Promise<DonneesPaginees<unknown>>,
  ): Promise<DonneesPaginees<unknown>> {
    try {
      return await action();
    } catch (erreur) {
      if (erreur instanceof ErreurFiltreListe) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          details: [{ champ: erreur.champ, message: erreur.message }],
        });
      }
      throw erreur;
    }
  }
}
