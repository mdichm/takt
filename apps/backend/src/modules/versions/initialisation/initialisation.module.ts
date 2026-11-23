// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { CommonModule } from '../../common/common.module';
import { InitialisationController } from './initialisation.controller';
import { InitialisationService } from './initialisation.service';

/**
 * Module d’initialisation d’un nouveau semestre (année + semestre + version
 * initiale) pour l’écran EC-GES-01.
 *
 * Dépend uniquement de `common` et `audit` (respect de la matrice de
 * dépendances `versions`). La notification aux rdep est injectée via le
 * jeton `NOTIFICATION_INITIALISATION` fourni globalement par le module
 * `notifications` (déclaré `@Global()`).
 */
@Module({
  imports: [CommonModule, AuditModule],
  controllers: [InitialisationController],
  providers: [InitialisationService],
  exports: [InitialisationService],
})
export class InitialisationModule {}