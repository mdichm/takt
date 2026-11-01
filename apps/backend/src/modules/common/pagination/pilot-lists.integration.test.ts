// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { creerPrismaClient, PrismaClient } from '@takt/db';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AllExceptionsFilter } from '../http/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from '../http/response-envelope.interceptor';
import { PilotListsModule } from './pilots/pilot-lists.module';

const ENV_TEST = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/takt_test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

const SUFFIXE = `pilote-${Date.now()}`;

describe('listes pilotes paginées', () => {
  let application: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env = { ...process.env, ...ENV_TEST };
    const moduleRef = await Test.createTestingModule({ imports: [PilotListsModule] }).compile();
    application = moduleRef.createNestApplication();
    application.useGlobalFilters(new AllExceptionsFilter());
    application.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
    application.setGlobalPrefix('api/v1');
    await application.init();

    prisma = creerPrismaClient(ENV_TEST.DATABASE_URL);
    const role = await prisma.role.create({
      data: { code: `admin-${SUFFIXE}`, libelle: 'Rôle pilote' },
    });
    await prisma.utilisateur.createMany({
      data: Array.from({ length: 150 }, (_, index) => ({
        email: `utilisateur-${SUFFIXE}-${index}@exemple.fr`,
        nom: index % 2 === 0 ? `Alice${index}` : `Martin${index}`,
        prenom: 'Camille',
        roleId: role.id,
        estActif: true,
      })),
    });
  });

  afterAll(async () => {
    await application?.close();
    await prisma?.utilisateur.deleteMany({ where: { email: { contains: SUFFIXE } } });
    await prisma?.role.deleteMany({ where: { code: `admin-${SUFFIXE}` } });
    await prisma?.$disconnect();
  });

  it('pagine exactement 150 utilisateurs et expose le total', async () => {
    const reponse = await request(application.getHttpServer()).get(
      '/api/v1/pilotes/users?page=2&pageSize=50',
    );

    expect(reponse.status).toBe(200);
    expect(reponse.body.data).toHaveLength(50);
    expect(reponse.body).toMatchObject({
      data: expect.any(Array),
      error: null,
      meta: { page: 2, pageSize: 50, total: 150 },
    });
  });

  it('rejette un champ de tri hors liste blanche', async () => {
    const reponse = await request(application.getHttpServer()).get(
      '/api/v1/pilotes/users?sortBy=roleId',
    );

    expect(reponse.status).toBe(400);
    expect(reponse.body).toMatchObject({
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        details: [{ champ: 'sortBy', message: 'Le champ de tri n’est pas autorisé' }],
      },
    });
  });

  it('limite la recherche aux champs déclarés', async () => {
    const reponse = await request(application.getHttpServer()).get(
      '/api/v1/pilotes/users?search=Alice0',
    );

    expect(reponse.status).toBe(200);
    expect(reponse.body.data.length).toBeGreaterThan(0);
    expect(
      reponse.body.data.every(
        (utilisateur: { nom: string; prenom: string; email: string }) =>
          utilisateur.nom.toLowerCase().includes('alice0') ||
          utilisateur.prenom.toLowerCase().includes('alice0') ||
          utilisateur.email.toLowerCase().includes('alice0'),
      ),
    ).toBe(true);
  });

  it('applique un filtre métier booléen', async () => {
    const reponse = await request(application.getHttpServer()).get(
      '/api/v1/pilotes/users?estActif=false',
    );

    expect(reponse.status).toBe(200);
    expect(reponse.body.meta.total).toBe(0);
    expect(reponse.body.data).toEqual([]);
  });

  it.each(['versions', 'seances'])('expose la liste pilote %s', async (ressource) => {
    const reponse = await request(application.getHttpServer()).get(
      `/api/v1/pilotes/${ressource}`,
    );

    expect(reponse.status).toBe(200);
    expect(reponse.body).toMatchObject({
      data: expect.any(Array),
      error: null,
      meta: { page: 1, pageSize: 20, total: expect.any(Number) },
    });
  });
});
