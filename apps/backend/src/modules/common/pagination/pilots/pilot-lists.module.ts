// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PilotListsController } from './pilot-lists.controller';
import { PilotListsService } from './pilot-lists.service';

/**
 * Module des endpoints pilotes. Il n'est volontairement pas importé par
 * `AppModule` : tant que TE-API-01 n'est pas livrée, aucune route métier
 * non protégée ne doit être exposée par l'application de production.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PilotListsController],
  providers: [PilotListsService],
})
export class PilotListsModule {}
