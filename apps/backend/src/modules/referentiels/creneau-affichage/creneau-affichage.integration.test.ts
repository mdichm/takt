// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_AFFICHAGE_EXISTANT = '00000000-0000-0000-0000-000000000911';
const ID_AFFICHAGE_INEXISTANT = '00000000-0000-0000-0000-000000000912';

describe('CreneauAffichage (TAKT-L04-05)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.creneauAffichage.upsert({
      where: { id: ID_AFFICHAGE_EXISTANT },
      update: { variante: 'NORMAL', decalageMinutes: 0 },
      create: {
        id: ID_AFFICHAGE_EXISTANT,
        variante: 'NORMAL',
        decalageMinutes: 0,
        plageReduiteMinutes: null,
        libelle: 'Grille normale',
      },
    });
    // Variante RAMADAN pour les tests
    await ctx.prisma.creneauAffichage.upsert({
      where: { variante: 'RAMADAN' },
      update: { decalageMinutes: 60, libelle: 'Grille Ramadan' },
      create: {
        variante: 'RAMADAN',
        decalageMinutes: 60,
        plageReduiteMinutes: 120,
        libelle: 'Grille Ramadan',
      },
    });
  });

  afterAll(async () => {
    await ctx.prisma.creneauAffichage.deleteMany({});
    await nettoyerContexteTest(ctx);
  });

  it('GET /referentiels/creneaux-affichage : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/creneaux-affichage')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    expect(reponse.body.data.meta).toBeDefined();
  });

  it('GET /referentiels/creneaux-affichage : filtre variante (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/creneaux-affichage?variante=RAMADAN')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    for (const item of reponse.body.data.items) {
      expect(item.variante).toBe('RAMADAN');
    }
  });

  it('POST /referentiels/creneaux-affichage : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/creneaux-affichage')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        variante: 'NORMAL',
        decalageMinutes: 0,
        libelle: 'Grille normale bis',
      })
      .expect(400);
    // Variante NORMAL existe déjà → 400
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/creneaux-affichage/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/creneaux-affichage/${ID_AFFICHAGE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_AFFICHAGE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/creneaux-affichage/${ID_AFFICHAGE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/creneaux-affichage/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/creneaux-affichage/${ID_AFFICHAGE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ decalageMinutes: 30 })
      .expect(200);
    expect(reponse.body.data.decalageMinutes).toBe(30);

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/creneaux-affichage/${ID_AFFICHAGE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ decalageMinutes: 30 })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/creneaux-affichage/:id : supprime (200 / 404)', async () => {
    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/creneaux-affichage/${ID_AFFICHAGE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});