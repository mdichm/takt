// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Liste tous les rôles applicatifs. */
  async list() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ code: 'asc' }],
    });
    this.logger.log(`${roles.length} rôle(s) récupéré(s)`);
    return roles;
  }
}