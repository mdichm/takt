// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { request as httpRequest } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TokenService } from '../auth/token.service';
import { EventsModule } from './events.module';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';

describe('Canal SSE', () => {
  let application: INestApplication;
  let urlBase: string;
  let dossierCles: string;
  let tokenService: TokenService;

  beforeAll(async () => {
    dossierCles = mkdtempSync(join(tmpdir(), 'takt-sse-'));
    const cle = generateKeyPairSync('rsa', { modulusLength: 2048 });
    writeFileSync(
      join(dossierCles, 'active.private.pem'),
      cle.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    );
    writeFileSync(
      join(dossierCles, 'active.public.pem'),
      cle.publicKey.export({ type: 'spki', format: 'pem' }),
    );
    process.env.JWT_KEYS_DIRECTORY = dossierCles;
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/takt_test';
    process.env.JWT_ACTIVE_KEY_ID = 'active';
    process.env.JWT_ISSUER = 'takt-test';
    process.env.JWT_AUDIENCE = 'takt-api';

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), EventsModule],
    }).compile();
    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1');
    await application.init();
    await application.listen(0);
    const adresse = application.getHttpServer().address() as AddressInfo;
    urlBase = `http://127.0.0.1:${adresse.port}`;
    tokenService = moduleRef.get(TokenService);
  });

  afterAll(async () => {
    await application?.close();
    rmSync(dossierCles, { recursive: true, force: true });
  });

  it('refuse une connexion sans access token', async () => {
    const reponse = await request(application.getHttpServer()).get('/api/v1/events');

    expect(reponse.status).toBe(401);
    expect(reponse.body).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('ouvre un flux text/event-stream avec un access token Bearer', async () => {
    const accessToken = tokenService.signAccessToken({
      sub: UTILISATEUR_ID,
      role: 'admin',
      departementIds: [],
    }).token;
    expect(tokenService.verifyAccessToken(accessToken).sub).toBe(UTILISATEUR_ID);
    const enTetes = await new Promise<Record<string, string | string[] | undefined>>(
      (resolve, reject) => {
        const requete = httpRequest(
          urlBase,
          {
            method: 'GET',
            path: '/api/v1/events',
            headers: { authorization: `Bearer ${accessToken}` },
          },
          (reponse) => {
            resolve(reponse.headers);
            reponse.destroy();
          },
        );
        requete.on('error', reject);
        requete.end();
      },
    );

    expect(enTetes['content-type']).toContain('text/event-stream');
  });
});
