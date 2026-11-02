// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CODE_ERREURS_DOCUMENTES, construireDocumentOpenApi } from './openapi-document';

const ENV_TEST = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/takt_test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('Document OpenAPI de l’application', () => {
  let application: INestApplication;

  beforeAll(async () => {
    process.env = { ...process.env, ...ENV_TEST };
    const { AppModule } = await import('../../../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await application.init();
  });

  afterAll(async () => {
    await application?.close();
  });

  it('expose le schéma de sécurité bearerAuth', () => {
    const document = construireDocumentOpenApi(application);

    expect(document.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('couvre les huit réponses du catalogue HTTP', () => {
    const document = construireDocumentOpenApi(application);

    expect(Object.keys(document.components?.responses ?? {})).toEqual([...CODE_ERREURS_DOCUMENTES]);
  });

  it('couvre la route opérationnelle implémentée', () => {
    const document = construireDocumentOpenApi(application);

    expect(document.paths?.['/health']?.get?.responses?.['200']).toBeDefined();
  });
});
