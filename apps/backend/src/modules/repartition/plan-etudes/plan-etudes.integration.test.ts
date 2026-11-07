// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestReferentiels, nettoyerContexteTest } from '../../referentiels/test-helper.integration';

const DEPARTEMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ETABLISSEMENT_ID = '11111111-1111-4111-8111-111111111111';
const PARCOURS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NIVEAU_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ANNEE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SEMESTRE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const MATIERE_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const MODULE_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const GRADE_ID = '11111111-2222-4333-8444-555555555555';
const TYPE_ID = '11111111-1111-4111-4111-111111111111';

describe('Plans d\'études (TAKT-L05-01)', () => {
  let ctx: Awaited<ReturnType<typeof creerContexteTestReferentiels>>;
  let planId: string;

  beforeAll(async () => {
    ctx = await creerContexteTestReferentiels();
    await ctx.prisma.etablissement.upsert({
      where: { id: ETABLISSEMENT_ID },
      update: { code: 'UNIV', libelle: 'Université Test' },
      create: { id: ETABLISSEMENT_ID, code: 'UNIV', libelle: 'Université Test' },
    });
    await ctx.prisma.departement.upsert({
      where: { id: DEPARTEMENT_ID },
      update: { code: 'INFO', libelle: 'Informatique' },
      create: { id: DEPARTEMENT_ID, code: 'INFO', libelle: 'Informatique', etablissementId: ETABLISSEMENT_ID },
    });
    await ctx.prisma.parcours.upsert({
      where: { id: PARCOURS_ID },
      update: { code: 'LIC-INFO', libelle: 'Licence Informatique', departementId: DEPARTEMENT_ID },
      create: { id: PARCOURS_ID, code: 'LIC-INFO', libelle: 'Licence Informatique', departementId: DEPARTEMENT_ID },
    });
    await ctx.prisma.niveau.upsert({
      where: { id: NIVEAU_ID },
      update: { code: 'L1', libelle: 'Licence 1', parcoursId: PARCOURS_ID },
      create: { id: NIVEAU_ID, code: 'L1', libelle: 'Licence 1', parcoursId: PARCOURS_ID },
    });
    await ctx.prisma.anneeUniversitaire.upsert({
      where: { id: ANNEE_ID },
      update: { libelle: '2026-2027' },
      create: { id: ANNEE_ID, libelle: '2026-2027', dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-06-30') },
    });
    await ctx.prisma.semestre.upsert({
      where: { id: SEMESTRE_ID },
      update: { numero: 1, anneeUniversitaireId: ANNEE_ID },
      create: { id: SEMESTRE_ID, numero: 1, anneeUniversitaireId: ANNEE_ID, dateDebut: new Date('2026-09-01'), dateFin: new Date('2027-01-31') },
    });
    await ctx.prisma.grade.upsert({
      where: { id: GRADE_ID },
      update: { code: 'L1', libelle: 'Licence 1' },
      create: { id: GRADE_ID, code: 'L1', libelle: 'Licence 1' },
    });
    await ctx.prisma.typeEnseignement.upsert({
      where: { id: TYPE_ID },
      update: { code: 'CM', libelle: 'Cours magistral', couleur: '#000000' },
      create: { id: TYPE_ID, code: 'CM', libelle: 'Cours magistral', couleur: '#000000' },
    });
    await ctx.prisma.module.upsert({
      where: { id: MODULE_ID },
      update: { code: 'MOD-MATH', libelle: 'Module Maths', typeEnseignementId: TYPE_ID, gradeId: GRADE_ID },
      create: { id: MODULE_ID, code: 'MOD-MATH', libelle: 'Module Maths', typeEnseignementId: TYPE_ID, gradeId: GRADE_ID },
    });
    await ctx.prisma.matiere.upsert({
      where: { id: MATIERE_ID },
      update: { code: 'MATH101', libelle: 'Mathématiques 1', moduleId: MODULE_ID },
      create: { id: MATIERE_ID, code: 'MATH101', libelle: 'Mathématiques 1', moduleId: MODULE_ID },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTest(ctx);
    if (planId) {
      await ctx.prisma.planEtudesMatiere.deleteMany({ where: { planEtudesId: planId } });
      await ctx.prisma.planEtudes.deleteMany({ where: { id: planId } });
    }
    await ctx.prisma.matiere.deleteMany({ where: { id: MATIERE_ID } });
    await ctx.prisma.module.deleteMany({ where: { id: MODULE_ID } });
    await ctx.prisma.typeEnseignement.deleteMany({ where: { id: TYPE_ID } });
    await ctx.prisma.grade.deleteMany({ where: { id: GRADE_ID } });
    await ctx.prisma.semestre.deleteMany({ where: { id: SEMESTRE_ID } });
    await ctx.prisma.anneeUniversitaire.deleteMany({ where: { id: ANNEE_ID } });
    await ctx.prisma.niveau.deleteMany({ where: { id: NIVEAU_ID } });
    await ctx.prisma.parcours.deleteMany({ where: { id: PARCOURS_ID } });
    await ctx.prisma.departement.deleteMany({ where: { id: DEPARTEMENT_ID } });
    await ctx.prisma.etablissement.deleteMany({ where: { id: ETABLISSEMENT_ID } });
  });

  it('POST /api/v1/plans-etudes : crée un plan (201)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/plans-etudes')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        parcoursId: PARCOURS_ID,
        niveauId: NIVEAU_ID,
        anneeUniversitaireId: ANNEE_ID,
        semestreId: SEMESTRE_ID,
        departementId: DEPARTEMENT_ID,
      })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    planId = reponse.body.data.id;
    expect(reponse.body.data.niveauId).toBe(NIVEAU_ID);
    expect(reponse.body.data.departementId).toBe(DEPARTEMENT_ID);
  });

  it('GET /api/v1/plans-etudes : liste (200)', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/plans-etudes')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.items).toBeDefined();
    expect(reponse.body.data.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/plans-etudes/:id : détail (200)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/plans-etudes/${planId}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.id).toBe(planId);
  });

  it('GET /api/v1/plans-etudes/:id : introuvable (404)', async () => {
    await ctx.agent
      .get('/api/v1/plans-etudes/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(404);
  });

  it('PATCH /api/v1/plans-etudes/:id : modifie (200)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/plans-etudes/${planId}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({})
      .expect(200);
    expect(reponse.body.data.id).toBe(planId);
  });

  it('POST /api/v1/plans-etudes/:id/matieres : ajoute une matière (201)', async () => {
    const reponse = await ctx.agent
      .post(`/api/v1/plans-etudes/${planId}/matieres`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({
        matiereId: MATIERE_ID,
        typeEnseignementId: TYPE_ID,
        volumeHoraire: 30,
        dureeCreneaux: 60,
        coefficient: 2,
      })
      .expect(201);
    expect(reponse.body.data.id).toBeDefined();
    expect(reponse.body.data.volumeHoraire).toBe(30);
  });

  it('GET /api/v1/plans-etudes/:id/volume-total : volume total (200)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/plans-etudes/${planId}/volume-total`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(reponse.body.data.volumeTotalHebdomadaire).toBe(30);
  });

  it('GET /api/v1/plans-etudes/:id/groupes-herites : groupes héritiers (200)', async () => {
    const reponse = await ctx.agent
      .get(`/api/v1/plans-etudes/${planId}/groupes-herites`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    expect(Array.isArray(reponse.body.data)).toBe(true);
  });

  it('DELETE /api/v1/plans-etudes/:id/matieres/:id : supprime une matière (200)', async () => {
    const matiere = await ctx.prisma.planEtudesMatiere.findFirst({
      where: { planEtudesId: planId },
    });
    expect(matiere).toBeDefined();
    const id = matiere!.id;

    await ctx.agent
      .delete(`/api/v1/plans-etudes/${planId}/matieres/${id}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
  });

  it('DELETE /api/v1/plans-etudes/:id : supprime le plan (200)', async () => {
    await ctx.agent
      .delete(`/api/v1/plans-etudes/${planId}`)
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .expect(200);
    planId = '';
  });
});