// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CommonModule } from '../common/common.module';
import { EtablissementController } from './etablissement/etablissement.controller';
import { EtablissementService } from './etablissement/etablissement.service';
import { DepartementController } from './departement/departement.controller';
import { DepartementService } from './departement/departement.service';
import { ParcoursController } from './parcours/parcours.controller';
import { ParcoursService } from './parcours/parcours.service';
import { NiveauController } from './niveau/niveau.controller';
import { NiveauService } from './niveau/niveau.service';
import { GroupeController } from './groupe/groupe.controller';
import { GroupeService } from './groupe/groupe.service';
import { ArbreController } from './arbre.controller';

/**
 * Module des référentiels métier (Établissement, Département, Parcours, Niveau, Groupe).
 *
 * Dépend uniquement de CommonModule et AuditModule (pas de cycle, GG-13).
 */
@Module({
  imports: [CommonModule, AuditModule],
  controllers: [
    EtablissementController,
    DepartementController,
    ParcoursController,
    NiveauController,
    GroupeController,
    ArbreController,
  ],
  providers: [
    EtablissementService,
    DepartementService,
    ParcoursService,
    NiveauService,
    GroupeService,
  ],
  exports: [
    EtablissementService,
    DepartementService,
    ParcoursService,
    NiveauService,
    GroupeService,
  ],
})
export class ReferentielsModule {}
