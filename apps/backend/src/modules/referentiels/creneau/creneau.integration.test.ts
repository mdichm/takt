// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_CRENEAU_EXISTANT = '00000000-0000-0000-0000-000000000901';
const ID_CRENEAU_INEXISTANT = '00000000-0000-0000-0000-000000000902';

describe('Creneau (TAKT-L04-05)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.creneau.upsert({
      where: { id: ID_CRENEAU_EXISTANT },
      update: { jour: 1, ordre: 1 },
      create: {
        id: ID_CRENEAU_EXISTANT,
        jour: 1,
        ordre: 1,
        heureDebut: new Date('2026-01-01T08:00:00Z'),
        heureFin: new Date('2026-01-01T08:30:00Z'),
        dureeMinutes: 30,
      },
    });
  });

  afterAll(async () => {
    await ctx.prisma.creneau.deleteMany({});
    await nettoyerContexteTest(ctx);
  });

  it('GET /referentiels/creneaux : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/creneaux')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    expect(reponse.body.data.meta).toBeDefined();
  });

  it('POST /referentiels/creneaux : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/creneaux')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        jour: 1,
        ordre: 2,
        heureDebut: '2026-01-01T08:30:00Z',
        heureFin: '2026-01-01T09:00:00Z',
        dureeMinutes: 30,
      })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.jour).toBe(1);
    expect(reponse.body.data.ordre).toBe(2);
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/creneaux : doublon [jour, ordre] (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/creneaux')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        jour: 1,
        ordre: 1,
        heureDebut: '2026-01-01T09:00:00Z',
        heureFin: '2026-01-01T09:30:00Z',
      })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /referentiels/creneaux : rupture continuité (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/creneaux')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        jour: 2,
        ordre: 2,
        heureDebut: '2026-01-02T09:00:00Z',
        heureFin: '2026-01-02T09:30:00Z',
      })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/creneaux/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/creneaux/${ID_CRENEAU_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_CRENEAU_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/creneaux/${ID_CRENEAU_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /referentiels/creneaux : filtre jour (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/creneaux?jour=1')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    for (const item of reponse.body.data.items) {
      expect(item.jour).toBe(1);
    }
  });

  it('PATCH /referentiels/creneaux/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/creneaux/${ID_CRENEAU_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ ordre: 1 })
      .expect(200);
    expect(reponse.body.data.ordre).toBe(1);

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/creneaux/${ID_CRENEAU_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ ordre: 1 })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/creneaux/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/creneaux')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        jour: 2,
        ordre: 1,
        heureDebut: '2026-01-02T08:00:00Z',
        heureFin: '2026-01-02T08:30:00Z',
      })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/creneaux/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/creneaux/${ID_CRENEAU_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});