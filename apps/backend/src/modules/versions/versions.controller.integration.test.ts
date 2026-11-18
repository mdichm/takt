// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  creerContexteTestReferentiels,
  type ContexteTestReferentiels,
  nettoyerContexteTest,
} from '../referentiels/test-helper.integration';

const ANNEE_ID = '77777777-7777-7777-7777-777777777777';
const SEMESTRE_ID = '66666666-6666-6666-6666-666666666666';
const SEMESTRE_TRANSITION_ID = '66666666-6666-6666-6666-666666666667';
const VERSION_EXISTANTE_ID = '88888888-8888-8888-8888-888888888888';
const VERSION_INEXISTANTE_ID = '99999999-9999-9999-9999-999999999999';

describe('Versions (TAKT-L06-01)', () => {
  let ctx: ContexteTestReferentiels;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();

    await ctx.prisma.anneeUniversitaire.upsert({
      where: { id: ANNEE_ID },
      update: {},
      create: {
        id: ANNEE_ID,
        libelle: '2024-2025',
        dateDebut: new Date('2024-09-01'),
        dateFin: new Date('2025-06-30'),
      },
    });
    await ctx.prisma.semestre.upsert({
      where: { id: SEMESTRE_ID },
      update: {},
      create: {
        id: SEMESTRE_ID,
        numero: 1,
        anneeUniversitaireId: ANNEE_ID,
        dateDebut: new Date('2024-09-01'),
        dateFin: new Date('2025-01-31'),
      },
    });
    await ctx.prisma.semestre.upsert({
      where: { id: SEMESTRE_TRANSITION_ID },
      update: {},
      create: {
        id: SEMESTRE_TRANSITION_ID,
        numero: 2,
        anneeUniversitaireId: ANNEE_ID,
        dateDebut: new Date('2025-02-01'),
        dateFin: new Date('2025-06-30'),
      },
    });

    await ctx.prisma.version.create({
      data: {
        id: VERSION_EXISTANTE_ID,
        semestreId: SEMESTRE_ID,
        anneeId: ANNEE_ID,
        etat: 'archive',
      },
    });
  });

  afterAll(async () => {
    await ctx.prisma.version.deleteMany({ where: { semestreId: SEMESTRE_ID } });
    await ctx.prisma.version.deleteMany({ where: { semestreId: SEMESTRE_TRANSITION_ID } });
    await ctx.prisma.semestre.delete({ where: { id: SEMESTRE_ID } });
    await ctx.prisma.semestre.delete({ where: { id: SEMESTRE_TRANSITION_ID } });
    await ctx.prisma.anneeUniversitaire.delete({ where: { id: ANNEE_ID } });
    await nettoyerContexteTest(ctx);
  });

  it('POST /versions : crée une version (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ semestreId: SEMESTRE_ID })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.etat).toBe('brouillon');
    expect(reponse.body.data.anneeId).toBe(ANNEE_ID);
    expect(reponse.body.data.datePublication).toBeNull();
    expect(reponse.body.data.publiePar).toBeNull();
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /versions : anneeId incohérente (400)', async () => {
    await ctx.agent
      .post('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        semestreId: SEMESTRE_ID,
        anneeId: '00000000-0000-0000-0000-000000000999',
        etat: 'brouillon',
      })
      .expect(400);
  });

  it('GET /versions : liste paginée (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.items).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    expect(reponse.body.data.meta.page).toBe(1);
    expect(reponse.body.data.meta.pageSize).toBe(20);
    expect(reponse.body.data.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /versions : filtre par semestre (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .query({ semestreId: SEMESTRE_ID })
      .expect(200);
    expect(reponse.body.data.items.every((v: { semestreId: string }) => v.semestreId === SEMESTRE_ID)).toBe(true);
  });

  it('GET /versions/:id : détail (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ semestreId: SEMESTRE_ID })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .get(`/api/v1/versions/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .get(`/api/v1/versions/${VERSION_INEXISTANTE_ID}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /versions/:id/dupliquer : duplique une version archivée (201)', async () => {
    const reponse = await ctx.agent
      .post(`/api/v1/versions/${VERSION_EXISTANTE_ID}/dupliquer`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.etat).toBe('initial');
    expect(reponse.body.data.semestreId).toBe(SEMESTRE_ID);
    const source = await ctx.prisma.version.findUnique({ where: { id: VERSION_EXISTANTE_ID } });
    expect(source?.etat).toBe('archive');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /versions/:id/dupliquer : source non archivée (409)', async () => {
    const brouillon = await ctx.agent
      .post('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ semestreId: SEMESTRE_ID })
      .expect(201);
    ctx.idsACleaner.push(brouillon.body.data.id);

    await ctx.agent
      .post(`/api/v1/versions/${brouillon.body.data.id}/dupliquer`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(409);
  });

  it('POST /versions : deux versions publiées sur même semestre (409)', async () => {
    await ctx.agent
      .post('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ semestreId: SEMESTRE_ID, etat: 'publie' })
      .expect(201);
    await ctx.agent
      .post('/api/v1/versions')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ semestreId: SEMESTRE_ID, etat: 'publie' })
      .expect(409);
  });

  it('POST /versions : sans authentification (401)', async () => {
    await ctx.agent.post('/api/v1/versions').send({ semestreId: SEMESTRE_ID }).expect(401);
  });

  describe('POST /versions/:id/transition (TAKT-L06-02)', () => {
    afterEach(async () => {
      await ctx.prisma.version.deleteMany({ where: { semestreId: SEMESTRE_TRANSITION_ID } });
    });

    it('refuse une transition réservée à un autre rôle (403 avec token admin)', async () => {
      const cree = await ctx.agent
        .post('/api/v1/versions')
        .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
        .send({ semestreId: SEMESTRE_TRANSITION_ID })
        .expect(201);
      const id = cree.body.data.id;
      ctx.idsACleaner.push(id);

      // lancerGeneration est réservé au role 'gest', pas à 'admin'
      await ctx.agent
        .post(`/api/v1/versions/${id}/transition`)
        .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
        .send({ action: 'lancerGeneration' })
        .expect(403);
    });

    it('refuse une transition interdite depuis l’état (409)', async () => {
      const cree = await ctx.agent
        .post('/api/v1/versions')
        .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
        .send({ semestreId: SEMESTRE_TRANSITION_ID, etat: 'publie' })
        .expect(201);
      const id = cree.body.data.id;
      ctx.idsACleaner.push(id);

      // archiver est autorisé depuis publie, mais une transition inconnue est interdite
      await ctx.agent
        .post(`/api/v1/versions/${id}/transition`)
        .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
        .send({ action: 'lancerGeneration' })
        .expect(409);
    });

    it('refuse une version inexistante (404)', async () => {
      await ctx.agent
        .post(`/api/v1/versions/${VERSION_INEXISTANTE_ID}/transition`)
        .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
        .send({ action: 'archiver' })
        .expect(404);
    });

    it('applique archiver depuis publie avec token admin (200)', async () => {
      const cree = await ctx.agent
        .post('/api/v1/versions')
        .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
        .send({ semestreId: SEMESTRE_TRANSITION_ID, etat: 'publie' })
        .expect(201);
      const id = cree.body.data.id;
      ctx.idsACleaner.push(id);

      const reponse = await ctx.agent
        .post(`/api/v1/versions/${id}/transition`)
        .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
        .send({ action: 'archiver' })
        .expect(200);
      expect(reponse.body.data.etat).toBe('archive');
    });
  });
});