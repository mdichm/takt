// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../test-helper.integration';

const ID_TYPE = '00000000-0000-0000-0000-000000000401';
const ID_GRADE = '00000000-0000-0000-0000-000000000402';
let ID_COUPLE_EXISTANT: string;
const ID_COUPLE_INEXISTANT = '00000000-0000-0000-0000-000000000404';

describe('GradeTypeEnseignement — Matrice (TAKT-L04-02)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();

    await ctx.prisma.typeEnseignement.upsert({
      where: { id: ID_TYPE },
      update: {},
      create: { id: ID_TYPE, code: 'CM-TEST', libelle: 'Cours magistral test', couleur: '#3B82F6' },
    });
    await ctx.prisma.grade.upsert({
      where: { id: ID_GRADE },
      update: {},
      create: { id: ID_GRADE, code: 'L1-TEST', libelle: 'Licence 1 test' },
    });
    const couple = await ctx.prisma.gradeTypeEnseignement.create({
      data: { gradeId: ID_GRADE, typeEnseignementId: ID_TYPE },
    });
    ID_COUPLE_EXISTANT = couple.id;
    // Vérification immédiate
    const verif = await ctx.prisma.gradeTypeEnseignement.findUnique({ where: { id: couple.id } });
    if (!verif) {
      throw new Error(`Couple non trouvé après création, id=${couple.id}`);
    }
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    await ctx.prisma.gradeTypeEnseignement.deleteMany({
      where: { id: { in: [ID_COUPLE_EXISTANT] } },
    });
    await ctx.prisma.grade.deleteMany({ where: { id: ID_GRADE } });
    await ctx.prisma.typeEnseignement.deleteMany({ where: { id: ID_TYPE } });
  });

  it('GET /referentiels/grade-type-enseignements : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/referentiels/grade-type-enseignements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data).toBeDefined();
    expect(Array.isArray(reponse.body.data.items)).toBe(true);
  });

  it('POST /referentiels/grade-type-enseignements : crée (201)', async () => {
    // Crée un nouveau grade et type pour ce test
    const idType2 = '00000000-0000-0000-0000-000000000410';
    const idGrade2 = '00000000-0000-0000-0000-000000000411';
    await ctx.prisma.typeEnseignement.upsert({
      where: { id: idType2 },
      update: {},
      create: { id: idType2, code: 'TD-TEST', libelle: 'TD test', couleur: '#10B981' },
    });
    await ctx.prisma.grade.upsert({
      where: { id: idGrade2 },
      update: {},
      create: { id: idGrade2, code: 'L2-TEST', libelle: 'Licence 2 test' },
    });

    const reponse = await ctx.agent
      .post('/api/v1/referentiels/grade-type-enseignements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ gradeId: idGrade2, typeEnseignementId: idType2 })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    ctx.idsACleaner.push(reponse.body.data.id);
    ctx.idsACleaner.push(idType2);
    ctx.idsACleaner.push(idGrade2);
  });

  it('POST /referentiels/grade-type-enseignements : doublon (400)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/referentiels/grade-type-enseignements')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ gradeId: ID_GRADE, typeEnseignementId: ID_TYPE })
      .expect(400);
    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /referentiels/grade-type-enseignements/:id : détail (200 / 404)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/referentiels/grade-type-enseignements/${ID_COUPLE_EXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(ID_COUPLE_EXISTANT);

    const reponse404 = await ctx.agent
      .get(`/api/v1/referentiels/grade-type-enseignements/${ID_COUPLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /referentiels/grade-type-enseignements/:id : supprime (200 / 404)', async () => {
    // Crée un couple temporaire pour le supprimer
    const idTypeTmp = '00000000-0000-0000-0000-000000000420';
    const idGradeTmp = '00000000-0000-0000-0000-000000000421';
    await ctx.prisma.typeEnseignement.upsert({
      where: { id: idTypeTmp },
      update: {},
      create: { id: idTypeTmp, code: 'TP-TEST', libelle: 'TP test', couleur: '#F59E0B' },
    });
    await ctx.prisma.grade.upsert({
      where: { id: idGradeTmp },
      update: {},
      create: { id: idGradeTmp, code: 'M1-TEST', libelle: 'Master 1 test' },
    });
    const couple = await ctx.prisma.gradeTypeEnseignement.create({
      data: { gradeId: idGradeTmp, typeEnseignementId: idTypeTmp },
    });

    const reponse = await ctx.agent
      .delete(`/api/v1/referentiels/grade-type-enseignements/${couple.id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(couple.id);
    ctx.idsACleaner.push(idTypeTmp);
    ctx.idsACleaner.push(idGradeTmp);

    const reponse404 = await ctx.agent
      .delete(`/api/v1/referentiels/grade-type-enseignements/${ID_COUPLE_INEXISTANT}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');
  });
});
