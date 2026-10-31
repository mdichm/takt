// ============================================================================
// TAKT — Amorçage de l'application NestJS
// Fichier : apps/backend/src/bootstrap.ts
// Ticket : TAKT-L01-03
//
// Rôle : construire une instance d'application configurée de façon
// identique en production et en test d'intégration. `main.ts` se contente
// d'amorcer puis d'écouter ; les tests utilisent `createApplication()`.
// ============================================================================

import { INestApplication, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { construireDocumentOpenApi } from './modules/common/openapi/openapi-document';

/** Méthodes HTTP autorisées par la politique CORS. */
const METHODES_CORS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/**
 * Convertit la liste d'origines autorisées (séparées par des virgules) en
 * tableau exploitable par `enableCors`.
 */
export function originesAutorisees(valeurBrute: string): string[] {
  return valeurBrute
    .split(',')
    .map((origine) => origine.trim())
    .filter((origine) => origine.length > 0);
}

/**
 * Crée une instance d'application entièrement configurée.
 * L'application n'écoute pas : l'appel à `listen()` est laissé à l'appelant.
 */
export async function createApplication(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // En-têtes de sécurité HTTP (helmet).
  app.use(helmet());

  // CORS restreint aux origines explicitement autorisées.
  app.enableCors({
    origin: originesAutorisees(config.get<string>('CORS_ORIGINS') ?? ''),
    credentials: true,
    methods: METHODES_CORS,
  });

  // Préfixe global de l'API ; `/health` reste un endpoint opérationnel.
  app.setGlobalPrefix(config.get<string>('API_PREFIX') ?? 'api/v1', {
    exclude: ['health'],
  });

  // Documentation OpenAPI (GG-02 : la spécification committée fait foi).
  const document = construireDocumentOpenApi(app);
  SwaggerModule.setup('api/docs', app, document);

  return app;
}

/**
 * Crée l'application puis l'ouvre sur le port configuré.
 */
export async function startApplication(): Promise<INestApplication> {
  const app = await createApplication();
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;

  await app.listen(port);
  new Logger('Bootstrap').log(`API TAKT démarrée sur le port ${port}`);

  return app;
}
