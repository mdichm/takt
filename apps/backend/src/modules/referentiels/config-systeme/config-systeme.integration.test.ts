// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

describe('ConfigSysteme (TAKT-L04-05)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
  });

  afterAll(async () => {
    await ctx.prisma.configSysteme.deleteMany({});
    await nettoyerContexteTest(ctx);
  });

  it('GET /referentiels/config-systeme : crée par défaut si absente (200)', async () => {
    // Nettoie pour forcer la création par défaut
    await ctx.prisma.configSysteme.deleteMany({});

    const reponse = await ctx.agent
      .get('/api/v1/referentiels/config-systeme')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.pasDeTempsMinutes).toBe(30);
    expect(reponse.body.data.joursOuvres).toBe('1,2,3,4,5,6');
    expect(reponse.body.data.creneauxParJour).toBe(24);
  });

  it('GET /referentiels/config-systeme : retourne l’existante (200)', async () => {
    await ctx.prisma.configSysteme.upsert({
      where: { id: '00000000-0000-0000-0000-000000000921' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000921',
        pasDeTempsMinutes: 30,
        joursOuvres: '1,2,3,4,5,6',
        creneauxParJour: 24,
      },
    });

    const reponse = await ctx.agent
      .get('/api/v1/referentiels/config-systeme')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.pasDeTempsMinutes).toBe(30);
    expect(reponse.body.data.creneauxParJour).toBe(24);
  });

  it('PATCH /referentiels/config-systeme : modifie (200)', async () => {
    await ctx.prisma.configSysteme.upsert({
      where: { id: '00000000-0000-0000-0000-000000000922' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000922',
        pasDeTempsMinutes: 30,
        joursOuvres: '1,2,3,4,5,6',
        creneauxParJour: 24,
      },
    });

    const reponse = await ctx.agent
      .patch('/api/v1/referentiels/config-systeme')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ pasDeTempsMinutes: 15, creneauxParJour: 48 })
      .expect(200);
    expect(reponse.body.data.pasDeTempsMinutes).toBe(15);
    expect(reponse.body.data.creneauxParJour).toBe(48);
  });

  it('PATCH /referentiels/config-systeme : pasDeTempsMinutes invalide (400)', async () => {
    const reponse = await ctx.agent
      .patch('/api/v1/referentiels/config-systeme')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ pasDeTempsMinutes: 0 })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });
});
