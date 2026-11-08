// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Controller, Get, INestApplication, Param, Query } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import { ApiError } from './api-error';
import { ZodQueryPipe } from '../pipes/zod-validation.pipe';

const ENV_TEST = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/takt_test',
  JWT_KEYS_DIRECTORY: '/tmp/takt-test-jwt',
  JWT_ACTIVE_KEY_ID: 'active',
  JWT_ISSUER: 'takt-test',
  JWT_AUDIENCE: 'takt-api',
};

const SchemaEmail = z.object({ email: z.string().email('Email invalide') });

@Controller('demonstration')
class ControleurDemonstration {
  @Get('liste')
  liste(): {
    data: Array<{ id: number }>;
    meta: { page: number; pageSize: number; total: number };
  } {
    return {
      data: [{ id: 1 }, { id: 2 }],
      meta: { page: 2, pageSize: 2, total: 5 },
    };
  }

  @Get('validation')
  validation(@Query(new ZodQueryPipe(SchemaEmail)) query: z.infer<typeof SchemaEmail>): {
    valide: boolean;
  } {
    void query;
    return { valide: true };
  }

  @Get('erreur/:code')
  erreur(@Param('code') code: string): never {
    const erreurs: Record<string, () => never> = {
      unauthorized: () => {
        throw new HttpException('Authentification requise', HttpStatus.UNAUTHORIZED);
      },
      forbidden: () => {
        throw new HttpException('Accès interdit', HttpStatus.FORBIDDEN);
      },
      not_found: () => {
        throw new HttpException('Ressource introuvable', HttpStatus.NOT_FOUND);
      },
      conflict: () => {
        throw new HttpException('Transition invalide', HttpStatus.CONFLICT);
      },
      locked: () => {
        throw new HttpException('Séance verrouillée', 423);
      },
      rate_limited: () => {
        throw new HttpException('Trop de requêtes', HttpStatus.TOO_MANY_REQUESTS);
      },
      internal: () => {
        throw new Error('détail technique confidentiel');
      },
    };

    const lever = erreurs[code];
    if (!lever) {
      throw new ApiError('NOT_FOUND', HttpStatus.NOT_FOUND, 'Démonstration inconnue');
    }
    return lever();
  }
}

describe("Enveloppe et catalogue d'erreurs API", () => {
  let application: INestApplication;

  beforeAll(async () => {
    process.env = { ...process.env, ...ENV_TEST };
    const { AppModule } = await import('../../../app.module.js');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ControleurDemonstration],
    }).compile();
    application = moduleRef.createNestApplication();
    application.setGlobalPrefix('api/v1', { exclude: ['health'] });
    await application.init();
  });

  afterAll(async () => {
    await application?.close();
  });

  it('renveloppe une liste paginée avec ses métadonnées', async () => {
    const reponse = await request(application.getHttpServer()).get('/api/v1/demonstration/liste');

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      data: [{ id: 1 }, { id: 2 }],
      error: null,
      meta: { page: 2, pageSize: 2, total: 5 },
    });
    expect(reponse.body.meta.requestId).toBeTypeOf('string');
    expect(reponse.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('normalise une erreur Zod en 400 avec détails en français', async () => {
    const reponse = await request(application.getHttpServer()).get(
      '/api/v1/demonstration/validation?email=invalide',
    );

    expect(reponse.status).toBe(400);
    expect(reponse.body).toMatchObject({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        details: [{ champ: 'email', message: 'Email invalide' }],
      },
    });
  });

  it.each([
    ['unauthorized', 401, 'UNAUTHORIZED'],
    ['forbidden', 403, 'FORBIDDEN'],
    ['not_found', 404, 'NOT_FOUND'],
    ['conflict', 409, 'WORKFLOW_INVALID_TRANSITION'],
    ['locked', 423, 'SEANCE_LOCKED'],
    ['rate_limited', 429, 'RATE_LIMITED'],
    ['internal', 500, 'INTERNAL_ERROR'],
  ])('normalise le code %s dans le catalogue', async (cas, statut, code) => {
    const reponse = await request(application.getHttpServer()).get(
      `/api/v1/demonstration/erreur/${cas}`,
    );

    expect(reponse.status).toBe(statut);
    expect(reponse.body).toMatchObject({
      data: null,
      error: { code },
    });
    expect(reponse.body.meta.requestId).toBeTypeOf('string');
    expect(reponse.body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ne divulgue aucun détail interne pour une erreur 500', async () => {
    const reponse = await request(application.getHttpServer()).get(
      '/api/v1/demonstration/erreur/internal',
    );

    expect(reponse.status).toBe(500);
    expect(JSON.stringify(reponse.body)).not.toContain('détail technique confidentiel');
    expect(JSON.stringify(reponse.body)).not.toContain('stack');
    expect(reponse.body.error).toEqual({ code: 'INTERNAL_ERROR' });
  });
});
