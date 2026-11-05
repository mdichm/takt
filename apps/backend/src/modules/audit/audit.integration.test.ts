// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { creerPrismaClient } from '@takt/db';
import { PRISMA } from '../common/di/prisma.token';
import { validateEnv } from '../../config/env.schema';
import { AuditModule } from './audit.module';
import { AuditService } from './audit.service';

const NB_MUTATIONS = 100;
const UTILISATEUR_ID_TEST = '11111111-1111-4111-8111-111111111111';

describe('Journal d’audit — écriture (TAKT-L03-06)', () => {
  let application: INestApplication;
  let prisma: ReturnType<typeof creerPrismaClient>;
  let service: AuditService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnv,
        }),
        AuditModule,
      ],
    })
      .overrideProvider(PRISMA)
      .useValue(creerPrismaClient(process.env.DATABASE_URL!))
      .compile();

    service = moduleRef.get(AuditService);
    application = moduleRef.createNestApplication();
    await application.init();

    prisma = creerPrismaClient(process.env.DATABASE_URL!);

    // Crée un rôle et un utilisateur de test pour satisfaire la FK utilisateurId
    await prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: { code: 'admin', libelle: 'Administrateur' },
    });
    const roleAdmin = await prisma.role.findUnique({ where: { code: 'admin' } });
    await prisma.utilisateur.upsert({
      where: { id: UTILISATEUR_ID_TEST },
      update: {},
      create: {
        id: UTILISATEUR_ID_TEST,
        email: 'test-audit@takt.test',
        nom: 'Test',
        prenom: 'Audit',
        roleId: roleAdmin!.id,
        estActif: true,
      },
    });

    // Nettoie les entrées de test éventuelles
    await prisma.journalAudit.deleteMany({
      where: { entite: 'TestAuditIntegration' },
    });
  });

  afterAll(async () => {
    await prisma.journalAudit.deleteMany({
      where: { entite: 'TestAuditIntegration' },
    });
    await prisma.utilisateur.delete({
      where: { id: UTILISATEUR_ID_TEST },
    });
    await prisma.$disconnect();
    await application.close();
  });

  it('écrit une entrée d’audit avec tous les champs (GG-07)', async () => {
    await service.record({
      action: 'CREATION',
      utilisateurId: '11111111-1111-4111-8111-111111111111',
      entite: 'TestAuditIntegration',
      entiteId: '22222222-2222-4222-8222-222222222222',
      metadonnees: { cle: 'valeur', nombre: 42 },
    });

    const entree = await prisma.journalAudit.findFirst({
      where: {
        entite: 'TestAuditIntegration',
        action: 'CREATION',
      },
    });

    expect(entree).not.toBeNull();
    expect(entree!.action).toBe('CREATION');
    expect(entree!.horodatage).toBeDefined();
    expect(entree!.utilisateurId).toBe('11111111-1111-4111-8111-111111111111');
    expect(entree!.entite).toBe('TestAuditIntegration');
    expect(entree!.entiteId).toBe('22222222-2222-4222-8222-222222222222');
    expect(entree!.metadonnees).toMatchObject({ cle: 'valeur', nombre: 42 });
  });

  it('100 mutations asynchrones produisent 100 lignes (pas de perte)', async () => {
    const promises: Promise<unknown>[] = [];
    for (let i = 0; i < NB_MUTATIONS; i++) {
      promises.push(
        service.record({
          action: 'MODIFICATION',
          entite: 'TestAuditIntegration',
          entiteId: `test-${i}`,
          metadonnees: { indice: i },
        }),
      );
    }
    await Promise.all(promises);

    const count = await prisma.journalAudit.count({
      where: { entite: 'TestAuditIntegration', action: 'MODIFICATION' },
    });

    expect(count).toBe(NB_MUTATIONS);
  });

  it('supporte les actions du catalogue sans utilisateurId ni entiteId', async () => {
    await service.record({
      action: 'SUPPRESSION',
      entite: 'TestAuditIntegration',
    });

    const entree = await prisma.journalAudit.findFirst({
      where: {
        entite: 'TestAuditIntegration',
        action: 'SUPPRESSION',
        utilisateurId: null,
        entiteId: null,
      },
    });

    expect(entree).not.toBeNull();
    expect(entree!.metadonnees).toEqual({});
  });
});