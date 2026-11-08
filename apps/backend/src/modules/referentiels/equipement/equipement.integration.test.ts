// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_EQUIPEMENT_EXISTANT = '00000000-0000-0000-0000-000000000701';
const ID_EQUIPEMENT_INEXISTANT = '00000000-0000-0000-0000-000000000702';

describe('Équipement (TAKT-L04-04)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.equipement.upsert({
      where: { id: ID_EQUIPEMENT_EXISTANT },
      update: { code: 'VIDEOPRJ', libelle: 'Vidéo projecteur test' },
      create: { id: ID_EQUIPEMENT_EXISTANT, code: 'VIDEOPRJ', libelle: 'Vidéo projecteur test' },
    });
  });

  afterAll(async () => {
    await ctx.prisma.equipement.deleteMany({ where: { id: { in: [ID_EQUIPEMENT_EXISTANT] } } });
    await nettoyerContexteTest(ctx);
  });

  it('GET /referentiels/equipements : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/equipements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
  });

  it('POST /referentiels/equipements : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/equipements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'TABLEAU', libelle: 'Tableau blanc' })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('TABLEAU');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/equipements : doublon (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/equipements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'VIDEOPRJ', libelle: 'Doublon' })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/equipements/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/equipements/${ID_EQUIPEMENT_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_EQUIPEMENT_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/equipements/${ID_EQUIPEMENT_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/equipements/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/equipements/${ID_EQUIPEMENT_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Vidéo projecteur modifié' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Vidéo projecteur modifié');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/equipements/${ID_EQUIPEMENT_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/equipements/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/equipements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'MICRO', libelle: 'Micro sans fil' })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/equipements/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/equipements/${ID_EQUIPEMENT_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});
