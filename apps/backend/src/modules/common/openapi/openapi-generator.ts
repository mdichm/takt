// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../../app.module';
import { construireDocumentOpenApi, serialiserDocumentOpenApi } from './openapi-document';

/**
 * Crée une application NestJS sans écoute réseau et produit le document
 * OpenAPI correspondant aux routes réellement implémentées.
 */
export async function genererDocumentOpenApi(): Promise<string> {
  const application = await NestFactory.create(AppModule, { logger: false });
  const config = application.get(ConfigService);

  try {
    application.setGlobalPrefix(config.get<string>('API_PREFIX') ?? 'api/v1', {
      exclude: ['health'],
    });
    return serialiserDocumentOpenApi(construireDocumentOpenApi(application));
  } finally {
    await application.close();
  }
}

/** Point d'entrée utilisé par la CLI de génération du dépôt. */
export async function executerGenerateurOpenApi(cheminSortie: string): Promise<void> {
  const { writeFile } = await import('node:fs/promises');
  const yaml = await genererDocumentOpenApi();
  await writeFile(cheminSortie, yaml, 'utf8');
}
