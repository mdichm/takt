// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_SITE_EXISTANT = '00000000-0000-0000-0000-000000000501';
const ID_SITE_INEXISTANT = '00000000-0000-0000-0000-000000000502';

describe('Site (TAKT-L04-04)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.site.upsert({
      where: { id: ID_SITE_EXISTANT },
      update: { code: 'SITE-TEST', libelle: 'Site de test' },
      create: { id: ID_SITE_EXISTANT, code: 'SITE-TEST', libelle: 'Site de test' },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.site.deleteMany({ where: { id: { in: [ID_SITE_EXISTANT] } } });
  });

  it('GET /referentiels/sites : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/sites')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    expect(reponse.body.data.meta).toBeDefined();
  });

  it('POST /referentiels/sites : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/sites')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'SITE-2', libelle: 'Second site' })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('SITE-2');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/sites : doublon (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/sites')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'SITE-TEST', libelle: 'Doublon' })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/sites/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/sites/${ID_SITE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_SITE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/sites/${ID_SITE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/sites/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/sites/${ID_SITE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Site de test modifié' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Site de test modifié');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/sites/${ID_SITE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/sites/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/sites')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'SITE-3', libelle: 'Troisième site' })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/sites/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/sites/${ID_SITE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});