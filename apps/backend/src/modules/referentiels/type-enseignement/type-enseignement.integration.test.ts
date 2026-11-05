// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const CODE_TYPE_EXISTANT = '00000000-0000-0000-0000-000000000001';
const CODE_TYPE_INEXISTANT = '00000000-0000-0000-0000-000000000002';

describe('Type d’enseignement (TAKT-L04-02)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    // Nettoyage éventuel d'un type ayant le même code pour éviter les conflits d'unicité
    const typeExistant = await ctx.prisma.typeEnseignement.findUnique({ where: { code: 'CM-TEST' } });
    if (typeExistant && typeExistant.id !== CODE_TYPE_EXISTANT) {
      await ctx.prisma.gradeTypeEnseignement.deleteMany({ where: { typeEnseignementId: typeExistant.id } });
      await ctx.prisma.typeEnseignement.delete({ where: { id: typeExistant.id } });
    }
    await ctx.prisma.typeEnseignement.upsert({
      where: { id: CODE_TYPE_EXISTANT },
      update: { code: 'CM-TEST', libelle: 'Cours magistral test', couleur: '#3B82F6' },
      create: { id: CODE_TYPE_EXISTANT, code: 'CM-TEST', libelle: 'Cours magistral test', couleur: '#3B82F6' },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.typeEnseignement.deleteMany({ where: { id: { in: [CODE_TYPE_EXISTANT] } } });
  });

  it('GET /referentiels/type-enseignements : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/type-enseignements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
    expect(reponse.body.data.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('POST /referentiels/type-enseignements : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/type-enseignements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'TD-TEST', libelle: 'Travaux dirigés test', couleur: '#10B981' })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('TD-TEST');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/type-enseignements : doublon (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/type-enseignements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'CM-TEST', libelle: 'Doublon', couleur: '#3B82F6' })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/type-enseignements/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/type-enseignements/${CODE_TYPE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(CODE_TYPE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/type-enseignements/${CODE_TYPE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/type-enseignements/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/type-enseignements/${CODE_TYPE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Cours magistral modifié' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Cours magistral modifié');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/type-enseignements/${CODE_TYPE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/type-enseignements/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/type-enseignements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'TP-TEST', libelle: 'Travaux pratiques test', couleur: '#F59E0B' })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/type-enseignements/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/type-enseignements/${CODE_TYPE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});