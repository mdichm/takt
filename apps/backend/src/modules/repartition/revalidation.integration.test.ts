// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  creerContexteTestRepartition,
  nettoyerContexteTestRepartition,
  ContexteTestRepartition,
} from './test-helper.integration';

const DEPARTEMENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const DEPARTEMENT2_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const VERSION_ID = '88888888-8888-8888-8888-888888888888';
const AFFECTATION_ID_DEP1 = '11111111-1111-1111-1111-111111111111';
const AFFECTATION_ID_DEP2 = '22222222-2222-2222-2222-222222222222';
const PLAN_ETUDES_DEP2_ID = '33333333-3333-3333-3333-333333333333';
const PLAN_ETUDES_MATIERE_DEP2_ID = '44444444-4444-4444-4444-444444444444';

describe('Revalidation ciblée par département (TAKT-L05-05)', () => {
  let ctx: ContexteTestRepartition;

  beforeAll(async () => {
    ctx = await creerContexteTestRepartition();

    // Année universitaire dédiée au département 2 (contrainte d’unicité PlanEtudes sur niveau+année+semestre)
    await ctx.prisma.anneeUniversitaire.create({
      data: {
        id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
        libelle: '2025-2026',
        dateDebut: new Date('2025-09-01'),
        dateFin: new Date('2026-06-30'),
      },
    });

    await ctx.prisma.planEtudes.upsert({
      where: { id: PLAN_ETUDES_DEP2_ID },
      update: {},
      create: {
        id: PLAN_ETUDES_DEP2_ID,
        parcoursId: '22222222-2222-2222-2222-222222222222',
        niveauId: '33333333-3333-3333-3333-333333333333',
        anneeUniversitaireId: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
        semestreId: ctx.semestreId,
        departementId: DEPARTEMENT2_ID,
      },
    });
    await ctx.prisma.planEtudesMatiere.upsert({
      where: { id: PLAN_ETUDES_MATIERE_DEP2_ID },
      update: {},
      create: {
        id: PLAN_ETUDES_MATIERE_DEP2_ID,
        planEtudesId: PLAN_ETUDES_DEP2_ID,
        matiereId: ctx.matiereId,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHoraire: 3,
        dureeCreneaux: 90,
        coefficient: 1,
      },
    });

    await ctx.prisma.affectationPedagogique.create({
      data: {
        id: AFFECTATION_ID_DEP1,
        versionId: VERSION_ID,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignantId,
        matiereId: ctx.matiereId,
        groupeId: ctx.groupe1Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 4,
        dureeCreneaux: 90,
        departementId: DEPARTEMENT_ID,
      },
    });
    await ctx.prisma.affectationPedagogique.create({
      data: {
        id: AFFECTATION_ID_DEP2,
        versionId: VERSION_ID,
        semestreId: ctx.semestreId,
        enseignantId: ctx.enseignant2Id,
        matiereId: ctx.matiereId,
        groupeId: ctx.groupe2Id,
        typeEnseignementId: ctx.typeEnseignementId,
        volumeHebdo: 3,
        dureeCreneaux: 90,
        departementId: DEPARTEMENT2_ID,
      },
    });
  });

  afterAll(async () => {
    await nettoyerContexteTestRepartition(ctx);
  });

  async function valider(departementId: string, token: string) {
    await ctx.prisma.version.update({ where: { id: VERSION_ID }, data: { etat: 'rep_pedag' } });
    return ctx.agent
      .post('/api/v1/repartition/valider')
      .set('Authorization', `Bearer ${token}`)
      .send({ versionId: VERSION_ID, departementId })
      .expect(200);
  }
  it('valide les deux départements (admin) → états VALIDE, un snapshot chacun', async () => {
    await valider(DEPARTEMENT_ID, ctx.tokenAdmin);
    await valider(DEPARTEMENT2_ID, ctx.tokenAdmin);

    const vr1 = await ctx.prisma.validationRepartition.findFirst({
      where: { versionId: VERSION_ID, departementId: DEPARTEMENT_ID },
    });
    const vr2 = await ctx.prisma.validationRepartition.findFirst({
      where: { versionId: VERSION_ID, departementId: DEPARTEMENT2_ID },
    });
    expect(vr1).not.toBeNull();
    expect(vr1!.etat).toBe('VALIDE');
    expect(vr1!.revision).toBe(1);
    expect(vr2).not.toBeNull();
    expect(vr2!.etat).toBe('VALIDE');
    expect(vr2!.revision).toBe(1);
  });

  it('modifie les affectations du département 1 puis détecte : seul le département 1 est impacté', async () => {
    await ctx.prisma.affectationPedagogique.update({
      where: { id: AFFECTATION_ID_DEP1 },
      data: { volumeHebdo: 6 },
    });

    const reponse = await ctx.agent
      .post('/api/v1/repartition/revalidation/detecter')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ versionId: VERSION_ID })
      .expect(200);

    expect(reponse.body.data.notificationsCrees).toBeGreaterThanOrEqual(1);
    const impactes = reponse.body.data.departementsImpactes;
    const dep1 = impactes.find(
      (d: { departementId: string }) => d.departementId === DEPARTEMENT_ID,
    );
    const dep2 = impactes.find(
      (d: { departementId: string }) => d.departementId === DEPARTEMENT2_ID,
    );
    expect(dep1.etat).toBe('REVALIDATION_REQUISE');
    expect(dep2.etat).toBe('VALIDE');
    const notif = await ctx.prisma.notification.findFirst({
      where: { utilisateurId: ctx.idRdep, type: 'REVALIDATION_DEMANDEE' },
    });
    expect(notif).not.toBeNull();
  });

  it('revalide le département 1 (rdep) → nouveau snapshot révision 2, ancien hors service, état VALIDE', async () => {
    const reponse = await ctx.agent
      .post('/api/v1/repartition/revalidation/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT_ID })
      .expect(200);

    expect(reponse.body.data.etat).toBe('VALIDE');
    expect(reponse.body.data.revision).toBe(2);
    expect(reponse.body.data.snapshotPrecedentId).toBeDefined();

    const snapshots = await ctx.prisma.snapshot.findMany({
      where: { versionId: VERSION_ID, departementId: DEPARTEMENT_ID },
      orderBy: { revision: 'asc' },
    });
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]!.estCourant).toBe(false);
    expect(snapshots[1]!.estCourant).toBe(true);
    expect(snapshots[1]!.revision).toBe(2);

    const vr = await ctx.prisma.validationRepartition.findFirst({
      where: { versionId: VERSION_ID, departementId: DEPARTEMENT_ID },
    });
    expect(vr!.etat).toBe('VALIDE');
    expect(vr!.revision).toBe(2);
    expect(vr!.snapshotCourantId).toBe(snapshots[1]!.id);
    expect(vr!.snapshotPrecedentId).toBe(snapshots[0]!.id);
  });

  it('revalider un département déjà VALIDE → 409', async () => {
    await ctx.agent
      .post('/api/v1/repartition/revalidation/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT_ID })
      .expect(409);
  });

  it('un rdep du département 1 ne peut pas revalider le département 2 → 403', async () => {
    await ctx.prisma.affectationPedagogique.update({
      where: { id: AFFECTATION_ID_DEP2 },
      data: { volumeHebdo: 5 },
    });
    await ctx.agent
      .post('/api/v1/repartition/revalidation/detecter')
      .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
      .send({ versionId: VERSION_ID })
      .expect(200);

    await ctx.agent
      .post('/api/v1/repartition/revalidation/valider')
      .set('Authorization', `Bearer ${ctx.tokenRdep}`)
      .send({ versionId: VERSION_ID, departementId: DEPARTEMENT2_ID })
      .expect(403);
  });
});
