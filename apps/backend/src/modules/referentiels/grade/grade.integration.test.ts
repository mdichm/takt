// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const CODE_GRADE_EXISTANT = '00000000-0000-0000-0000-000000000101';
const CODE_GRADE_INEXISTANT = '00000000-0000-0000-0000-000000000102';

describe('Grade (TAKT-L04-02)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    // Nettoyage éventuel d'un grade ayant le même code pour éviter les conflits d'unicité
    const gradeExistant = await ctx.prisma.grade.findUnique({ where: { code: 'L1-TEST' } });
    if (gradeExistant && gradeExistant.id !== CODE_GRADE_EXISTANT) {
      await ctx.prisma.gradeTypeEnseignement.deleteMany({ where: { gradeId: gradeExistant.id } });
      await ctx.prisma.grade.delete({ where: { id: gradeExistant.id } });
    }
    await ctx.prisma.grade.upsert({
      where: { id: CODE_GRADE_EXISTANT },
      update: { code: 'L1-TEST', libelle: 'Licence 1 test' },
      create: { id: CODE_GRADE_EXISTANT, code: 'L1-TEST', libelle: 'Licence 1 test' },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.grade.deleteMany({ where: { id: { in: [CODE_GRADE_EXISTANT] } } });
  });

  it('GET /referentiels/grades : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/grades')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
  });

  it('POST /referentiels/grades : crée (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/grades')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'L2-TEST', libelle: 'Licence 2 test' })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.code).toBe('L2-TEST');
    ctx.idsACleaner.push(reponse.body.data.id);
  });

  it('POST /referentiels/grades : doublon (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/grades')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'L1-TEST', libelle: 'Doublon' })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/grades/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/grades/${CODE_GRADE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(CODE_GRADE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/grades/${CODE_GRADE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /referentiels/grades/:id : modifie (200 / 404)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/referentiels/grades/${CODE_GRADE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'Licence 1 modifiée' })
      .expect(200);
    expect(reponse.body.data.libelle).toBe('Licence 1 modifiée');

    const reponse404 = await ctx.agent
      .patch(`/api/v1/referentiels/grades/${CODE_GRADE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ libelle: 'X' })
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/grades/:id : supprime (200 / 404)', async () => {
    const cree = await ctx.agent
      .post('/api/v1/referentiels/grades')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ code: 'L3-TEST', libelle: 'Licence 3 test' })
      .expect(201);
    const id = cree.body.data.id;
    ctx.idsACleaner.push(id);

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/grades/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(id);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/grades/${CODE_GRADE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});
