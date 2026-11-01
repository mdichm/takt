// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { creerPrismaClient, PrismaClient } from '@takt/db';

/** Service transverse d'accès à PostgreSQL via Prisma. */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('URL de connexion à la base de données absente');
    }
    this.client = creerPrismaClient(connectionString);
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
