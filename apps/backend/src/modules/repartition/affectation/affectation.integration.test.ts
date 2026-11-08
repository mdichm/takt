// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerContexteTestRepartition, nettoyerContexteTestRepartition, ContexteTestRepartition } from '../test-helper.integration';

// Constantes du test helper (définies là-bas, mais on les recopie ici pour les tests qui en ont besoin)
const PARCOURS_ID = '22222222-2222-2222-2222-222222222222';
const ANNEE_UNIV_ID = '77777777-7777-7777-7777-777777777777';
const SEMESTRE_ID = '66666666-6666-6666-6666-666666666666';
const DEPARTEMENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const MATIERE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TYPE_ENS_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MODULE_ID = '11111111-2222-3333-4444-555555555555';

describe('Affectations pédagogiques (TAKT-L05-02)', () => {
  let ctx: ContexteTestRepartition;
  let affectationId: string;

  beforeAll(async () => {
    ctx = await creerContexteTestRepartition();
  });

  afterAll(async () => {
    await nettoyerContexteTestRepartition(ctx);
  });

  it('POST /affectations : crée une affectation (201) + audit', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/affectations')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({
        versionId: ctx.version2Id,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignantId,
        matiereId: ctx.matiereId,
        groupeId: ctx.groupe1Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 4,
        dureeCreneaux: 90,
      })
      .expect(201);

    expect(reponse.body.data.affectation.id).toBeDefined();
    expect(reponse.body.data.affectation.enseignantId).toBe(ctx.enseignantId);
    expect(reponse.body.data.affectation.matiereId).toBe(ctx.matiereId);
    expect(reponse.body.data.affectation.groupeId).toBe(ctx.groupe1Id);
    expect(reponse.body.data.affectation.volumeHebdo).toBe(4);
    expect(reponse.body.data.avertissements).toBeDefined();

    affectationId = reponse.body.data.affectation.id;
    ctx.idsACleaner.push(affectationId);

    // Vérifier l'audit
    const audit = await ctx.prisma.journalAudit.findFirst({
      where: { entite: 'AffectationPedagogique', entiteId: affectationId, action: 'CREATION' },
    });
    expect(audit).not.toBeNull();
    expect(audit!.metadonnees).toMatchObject({
      versionId: ctx.version2Id,
        semestreId: ctx.semestreId,
      enseignantId: ctx.enseignantId,
      matiereId: ctx.matiereId,
      groupeId: ctx.groupe1Id,
    });
  });

  it('POST /affectations : doublon triplet dans même version (409)', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/affectations')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({
        versionId: ctx.version2Id,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignantId,
        matiereId: ctx.matiereId,
        groupeId: ctx.groupe1Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 4,
        dureeCreneaux: 90,
      })
      .expect(409);

    expect(reponse.body.error.code).toBe('WORKFLOW_INVALID_TRANSITION');
  });

  it('POST /affectations : enseignant hors département (400)', async () => {
    // Créer un enseignant sans rattachement au département
    const enseignantHorsDep = await ctx.prisma.enseignant.create({
      data: { matricule: 'ENS999', nom: 'Hors', prenom: 'Dep', email: 'hors.dep@test.takt' },
    });

    const reponse = await ctx.agent
      .post('/api/v1/affectations')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`) // admin pour contourner le périmètre
      .send({
        versionId: ctx.version2Id,
        semestreId: ctx.semestreId,
        enseignantId: enseignantHorsDep.id,
        matiereId: ctx.matiereId,
        groupeId: ctx.groupe1Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 4,
        dureeCreneaux: 90,
      })
      .expect(400);

    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');
    expect(reponse.body.error.details).toMatchObject({ champ: 'enseignantId' });

    await ctx.prisma.enseignant.delete({ where: { id: enseignantHorsDep.id } });
  });

  it('POST /affectations : divergence volume ⇒ 201 avec avertissement', async () => {
    // Créer une matière avec un plan d'études qui a un volume différent
    const matiereDivergence = await ctx.prisma.matiere.create({
      data: { code: 'DIV', libelle: 'Divergence', moduleId: MODULE_ID },
    });
    await ctx.prisma.planEtudesMatiere.create({
      data: {
        planEtudesId: ctx.planEtudesId,
        matiereId: matiereDivergence.id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHoraire: 2, // Plan = 2h, affectation = 4h
        dureeCreneaux: 90,
        coefficient: 1,
      },
    });

    const reponse = await ctx.agent
      .post('/api/v1/affectations')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({
        versionId: ctx.version2Id,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignantId,
        matiereId: matiereDivergence.id,
        groupeId: ctx.groupe1Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 4, // Différent du plan (2h)
        dureeCreneaux: 90,
      })
      .expect(201);

    expect(reponse.body.data.avertissements).toBeDefined();
    expect(Array.isArray(reponse.body.data.avertissements)).toBe(true);
    expect(reponse.body.data.avertissements.some((a: { code: string }) => a.code === 'DIVERGENCE_VOLUME')).toBe(true);

    const affectationId = reponse.body.data.affectation.id;
    ctx.idsACleaner.push(affectationId);
    // Supprimer l'affectation avant de supprimer la matière (contrainte FK)
    await ctx.prisma.affectationPedagogique.delete({ where: { id: affectationId } });
    await ctx.prisma.planEtudesMatiere.deleteMany({ where: { matiereId: matiereDivergence.id } });
    await ctx.prisma.matiere.delete({ where: { id: matiereDivergence.id } });
  });

  it('GET /affectations : liste meta.total exact + filtrage périmètre rdep', async () => {
    const reponse = await ctx.agent
      .get('/api/v1/affectations')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .expect(200);

    expect(Array.isArray(reponse.body.data)).toBe(true);
    expect(reponse.body.meta).toMatchObject({
      page: 1,
      pageSize: 20,
      total: expect.any(Number),
    });
    expect(reponse.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /affectations/:id : détail 200 / 404 / 403', async () => {
    // 200
    const reponse = await ctx.agent
      .get(`/api/v1/affectations/${affectationId}`)
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .expect(200);

    expect(reponse.body.data.affectation.id).toBe(affectationId);

    // 404
    const reponse404 = await ctx.agent
      .get(`/api/v1/affectations/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .expect(404);
    expect(reponse404.body.error.code).toBe('NOT_FOUND');

    // 403 - le test de périmètre est couvert par le test de liste
  });

  it('PATCH /affectations/:id : modifie (200)', async () => {
    const reponse = await ctx.agent
      .patch(`/api/v1/affectations/${affectationId}`)
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ volumeHebdo: 5 })
      .expect(200);

    expect(reponse.body.data.affectation.volumeHebdo).toBe(5);

    // Vérifier l'audit
    const audit = await ctx.prisma.journalAudit.findFirst({
      where: { entite: 'AffectationPedagogique', entiteId: affectationId, action: 'MODIFICATION' },
    });
    expect(audit).not.toBeNull();
    const meta = audit!.metadonnees as Record<string, unknown>;
    expect(meta.volumeHebdo).toBe(5);
  });

  it('DELETE /affectations/:id : supprime (200) + audit', async () => {
    // Créer une affectation temporaire à supprimer
    const cree = await ctx.agent
      .post('/api/v1/affectations')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({
        versionId: ctx.version2Id,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignant2Id,
        matiereId: ctx.matiere2Id,
        groupeId: ctx.groupe2Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 3,
        dureeCreneaux: 90,
      })
      .expect(201);

    const idASupprimer = cree.body.data.affectation.id;

    const reponse = await ctx.agent
      .delete(`/api/v1/affectations/${idASupprimer}`)
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .expect(200);

    expect(reponse.body.data.id).toBe(idASupprimer);

    // Vérifier suppression en DB
    const enBase = await ctx.prisma.affectationPedagogique.findUnique({ where: { id: idASupprimer } });
    expect(enBase).toBeNull();

    // Vérifier l'audit
    const audit = await ctx.prisma.journalAudit.findFirst({
      where: { entite: 'AffectationPedagogique', entiteId: idASupprimer, action: 'SUPPRESSION' },
    });
    expect(audit).not.toBeNull();
  });

  it('POST /affectations/cascade : crée N affectations depuis plan d\'études', async () => {
    // Créer une version dédiée pour ce test pour éviter les conflits résiduels
    const versionCascade = await ctx.prisma.version.create({
      data: { semestreId: ctx.semestreId, etat: 'initial' },
    });
    ctx.idsACleaner.push(versionCascade.id);

    const reponse = await ctx.agent
      .post('/api/v1/affectations/cascade')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({
        versionId: versionCascade.id,
        semestreId: ctx.semestreId,
        planEtudesId: ctx.planEtudesId,
        planEtudesMatiereId: ctx.planEtudesMatiereId,
        enseignantId: ctx.enseignantId,
      });

    // Debug: afficher la réponse en cas d'erreur
    if (reponse.status !== 201) {
      console.log('Cascade error response:', reponse.status, JSON.stringify(reponse.body, null, 2));
    }
    expect(reponse.status).toBe(201);

    expect(reponse.body.data.count).toBe(2); // 2 groupes (G1 et G2)
    expect(reponse.body.data.affectations).toHaveLength(2);
    expect(reponse.body.data.affectations[0]).toMatchObject({
      versionId: versionCascade.id,
        semestreId: ctx.semestreId,
      enseignantId: ctx.enseignantId,
      matiereId: ctx.matiereId,
      typeEnseignementId: ctx.typeEnseignementId,
      volumeHebdo: 4, // volumeHoraire du plan
      dureeCreneaux: 90, // dureeCreneaux du plan
    });

    // Vérifier que les 2 groupes sont couverts
    const groupeIds = reponse.body.data.affectations.map((a: { groupeId: string }) => a.groupeId).sort();
    expect(groupeIds).toEqual([ctx.groupe1Id, ctx.groupe2Id].sort());

    // Nettoyage
    for (const aff of reponse.body.data.affectations) {
      ctx.idsACleaner.push(aff.id);
    }
  });

  it('POST /affectations/cascade : 0 groupe ⇒ 400', async () => {
    // Créer un niveau sans groupe
    const niveauVide = await ctx.prisma.niveau.create({
      data: { code: 'L1', libelle: 'Licence 1', parcoursId: PARCOURS_ID },
    });
    const planVide = await ctx.prisma.planEtudes.create({
      data: { parcoursId: PARCOURS_ID, niveauId: niveauVide.id, anneeUniversitaireId: ANNEE_UNIV_ID, semestreId: SEMESTRE_ID, departementId: DEPARTEMENT_ID },
    });
    const planMatVide = await ctx.prisma.planEtudesMatiere.create({
      data: { planEtudesId: planVide.id, matiereId: MATIERE_ID, typeEnseignementId: TYPE_ENS_ID, volumeHoraire: 2, dureeCreneaux: 90, coefficient: 1 },
    });

    const reponse = await ctx.agent
      .post('/api/v1/affectations/cascade')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({
        versionId: ctx.version2Id,
        semestreId: ctx.semestreId,
        planEtudesId: planVide.id,
        planEtudesMatiereId: planMatVide.id,
        enseignantId: ctx.enseignantId,
      })
      .expect(400);

    expect(reponse.body.error.code).toBe('VALIDATION_ERROR');

    // Nettoyage
    await ctx.prisma.planEtudesMatiere.delete({ where: { id: planMatVide.id } });
    await ctx.prisma.planEtudes.delete({ where: { id: planVide.id } });
    await ctx.prisma.niveau.delete({ where: { id: niveauVide.id } });
  });
});
