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
import { TypeEnseignementController } from './type-enseignement/type-enseignement.controller';
import { TypeEnseignementService } from './type-enseignement/type-enseignement.service';
import { GradeController } from './grade/grade.controller';
import { GradeService } from './grade/grade.service';
import { ModuleController } from './module/module.controller';
import { ModuleService } from './module/module.service';
import { MatiereController } from './matiere/matiere.controller';
import { MatiereService } from './matiere/matiere.service';
import { GradeTypeEnseignementController } from './grade-type-enseignement/grade-type-enseignement.controller';
import { GradeTypeEnseignementService } from './grade-type-enseignement/grade-type-enseignement.service';

/**
 * Module des référentiels métier (Établissement, Département, Parcours, Niveau, Groupe,
 * Type d’enseignement, Grade, Module, Matière, GradeTypeEnseignement).
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
    TypeEnseignementController,
    GradeController,
    ModuleController,
    MatiereController,
    GradeTypeEnseignementController,
  ],
  providers: [
    EtablissementService,
    DepartementService,
    ParcoursService,
    NiveauService,
    GroupeService,
    TypeEnseignementService,
    GradeService,
    ModuleService,
    MatiereService,
    GradeTypeEnseignementService,
  ],
  exports: [
    EtablissementService,
    DepartementService,
    ParcoursService,
    NiveauService,
    GroupeService,
    TypeEnseignementService,
    GradeService,
    ModuleService,
    MatiereService,
    GradeTypeEnseignementService,
  ],
})
export class ReferentielsModule {}
