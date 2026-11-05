// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { DepartmentScopeGuard } from '../guards/department-scope.guard';
import { VersionStateGuard } from '../guards/version-state.guard';

/**
 * Module regroupant les guards d'autorisation RBAC.
 * Fournit les guards réutilisables par tous les modules métier (users, versions, etc.).
 * Note : JwtAuthGuard est fourni par le module auth (qui possède TokenService)
 * afin de respecter la règle de dépendance common → auth (GG-13).
 */
@Module({
  providers: [
    { provide: Reflector, useValue: new Reflector() },
    RolesGuard,
    DepartmentScopeGuard,
    VersionStateGuard,
  ],
  exports: [
    RolesGuard,
    DepartmentScopeGuard,
    VersionStateGuard,
  ],
})
export class RbacModule {}
