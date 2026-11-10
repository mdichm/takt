// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

const ENV_TEST = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/takt_test',
  JWT_KEYS_DIRECTORY: '/tmp/takt-test-jwt',
  JWT_ACTIVE_KEY_ID: 'active',
  JWT_ISSUER: 'takt-test',
  JWT_AUDIENCE: 'takt-api',
};

describe('Application TAKT', () => {
  let application: INestApplication;

  beforeAll(async () => {
    process.env = { ...process.env, ...ENV_TEST };
    const { AppModule } = await import('./app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await application.init();
  });

  afterAll(async () => {
    await application?.close();
  });

  it('expose un endpoint de santé opérationnel', async () => {
    const reponse = await request(application.getHttpServer()).get('/health');

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({ status: 'ok' });
    expect(reponse.body).toHaveProperty('uptime');
    expect(reponse.body).toHaveProperty('version');
  });

  it('normalise une route inexistante dans l’enveloppe API', async () => {
    const reponse = await request(application.getHttpServer()).get('/api/v1/inconnue');

    expect(reponse.status).toBe(404);
    expect(reponse.body).toMatchObject({
      data: null,
      error: { code: 'NOT_FOUND' },
    });
    expect(reponse.body.meta).toHaveProperty('requestId');
    expect(reponse.body.meta).toHaveProperty('timestamp');
  });
});
