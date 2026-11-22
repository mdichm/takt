// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_CRS_EXISTANT = '00000000-0000-0000-0000-000000000601';
const ID_CRS_INEXISTANT = '00000000-0000-0000-0000-000000000602';

describe('ChargeRuleSet (TAKT-L09-04)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.chargeRuleSet.upsert({
      where: { id: ID_CRS_EXISTANT },
      update: {
        code: 'CRS-TEST',
        libelle: 'Règle de test',
        version: 1,
        estActive: false,
        coefficientsParType: { CM: 1.0, TD: 0.8 },
        cibleHebdomadaireParGrade: {},
      },
      create: {
        id: ID_CRS_EXISTANT,
        code: 'CRS-TEST',
        libelle: 'Règle de test',
        version: 1,
        estActive: false,
        coefficientsParType: { CM: 1.0, TD: 0.8 },
        cibleHebdomadaireParGrade: {},
      },
    });
  });

  afterAll(async () => {
    await ctx.prisma.chargeRuleSet.deleteMany({ where: { id: ID_CRS_EXISTANT } });
    await nettoyerContexteTest(ctx);
  });

  it('GET /referentiels/charge-rule-sets : liste paginée (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/charge-rule-sets')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    expect(reponse.body.data.meta).toBeDefined();
    expect(reponse.body.data.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /referentiels/charge-rule-sets/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/charge-rule-sets/${ID_CRS_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.code).toBe('CRS-TEST');

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/charge-rule-sets/${ID_CRS_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /referentiels/charge-rule-sets/actif : règle active (404 si aucune)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/charge-rule-sets/actif')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /referentiels/charge-rule-sets : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/charge-rule-sets')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'CRS-2',
        libelle: 'Règle 2',
        coefficientsParType: { CM: 1.2, TD: 0.9 },
      })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('CRS-2');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/charge-rule-sets : doublon code (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/charge-rule-sets')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'CRS-TEST',
        libelle: 'Doublon',
        coefficientsParType: { CM: 1.0 },
      })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /referentiels/charge-rule-sets/:id : modifie (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/charge-rule-sets')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'CRS-3',
        libelle: 'Règle 3',
        coefficientsParType: { CM: 1.0 },
      })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/charge-rule-sets/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Règle 3 modifiée' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Règle 3 modifiée');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/charge-rule-sets/${ID_CRS_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/charge-rule-sets/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/charge-rule-sets')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        code: 'CRS-4',
        libelle: 'Règle 4',
        coefficientsParType: { CM: 1.0 },
      })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/charge-rule-sets/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/charge-rule-sets/${ID_CRS_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});