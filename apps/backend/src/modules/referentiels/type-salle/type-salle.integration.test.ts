// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_TYPE_SALLE_EXISTANT = '00000000-0000-0000-0000-000000000601';
const ID_TYPE_SALLE_INEXISTANT = '00000000-0000-0000-0000-000000000602';

describe('Type de salle (TAKT-L04-04)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.typeSalle.upsert({
      where: { id: ID_TYPE_SALLE_EXISTANT },
      update: { code: 'CM-TEST', libelle: 'Cours magistral test' },
      create: { id: ID_TYPE_SALLE_EXISTANT, code: 'CM-TEST', libelle: 'Cours magistral test' },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.typeSalle.deleteMany({ where: { id: { in: [ID_TYPE_SALLE_EXISTANT] } } });
  });

  it('GET /referentiels/type-salles : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/type-salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
  });

  it('POST /referentiels/type-salles : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/type-salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'TP-TEST', libelle: 'Travaux pratiques' })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('TP-TEST');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/type-salles : doublon (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/type-salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'CM-TEST', libelle: 'Doublon' })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/type-salles/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/type-salles/${ID_TYPE_SALLE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_TYPE_SALLE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/type-salles/${ID_TYPE_SALLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/type-salles/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/type-salles/${ID_TYPE_SALLE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Cours magistral modifié' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Cours magistral modifié');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/type-salles/${ID_TYPE_SALLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/type-salles/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/type-salles')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'TD-TEST', libelle: 'Travaux dirigés' })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/type-salles/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/type-salles/${ID_TYPE_SALLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});