// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PRISMA } from '../common/di/prisma.token';
import { ActionAudit, AuditService, DonneesAudit } from './audit.service';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';

function creerPrismaMock() {
  return {
    journalAudit: {
      create: vi.fn().mockResolvedValue({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    },
  };
}

function creerDonneesAudit(overrides: Partial<DonneesAudit> = {}): DonneesAudit {
  return {
    action: 'CREATION' as ActionAudit,
    utilisateurId: UTILISATEUR_ID,
    entite: 'Utilisateur',
    entiteId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    metadonnees: { cle: 'valeur' },
    ...overrides,
  };
}

describe('AuditService', () => {
  it('appelle prisma.journalAudit.create avec les bons champs', async () => {
    const prisma = creerPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PRISMA, useValue: prisma }],
    }).compile();

    const service = moduleRef.get(AuditService);
    const donnees = creerDonneesAudit();

    const resultat = await service.record(donnees);

    expect(prisma.journalAudit.create).toHaveBeenCalledOnce();
    expect(prisma.journalAudit.create).toHaveBeenCalledWith({
      data: {
        action: donnees.action,
        utilisateurId: donnees.utilisateurId,
        entite: donnees.entite,
        entiteId: donnees.entiteId,
        metadonnees: donnees.metadonnees,
      },
    });
    expect(resultat).toEqual({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
  });

  it('utilise des valeurs par défaut quand utilisateurId, entiteId et metadonnees sont omis', async () => {
    const prisma = creerPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PRISMA, useValue: prisma }],
    }).compile();

    const service = moduleRef.get(AuditService);

    await service.record({ action: 'SUPPRESSION' as ActionAudit, entite: 'Role' });

    expect(prisma.journalAudit.create).toHaveBeenCalledWith({
      data: {
        action: 'SUPPRESSION',
        utilisateurId: null,
        entite: 'Role',
        entiteId: null,
        metadonnees: {},
      },
    });
  });

  it('supporte toutes les actions du catalogue (TAKT-L03-06)', async () => {
    const actions: ActionAudit[] = [
      'CREATION',
      'MODIFICATION',
      'SUPPRESSION',
      'TRANSITION_ETAT',
      'POSE_VERROU',
      'LEVEE_VERROU',
      'EXPORT',
      'PUBLICATION',
      'CONNEXION',
      'FORCAGE_BAIL',
      'UTILISATEUR_CREE',
      'UTILISATEUR_MODIFIE',
      'UTILISATEUR_SUPPRIME',
      'UTILISATEUR_DESACTIVE',
      'UTILISATEUR_REACTIVE',
      'LOGIN',
      'LOGOUT',
      'REFRESH',
    ];

    for (const action of actions) {
      const prisma = creerPrismaMock();
      const moduleRef = await Test.createTestingModule({
        providers: [AuditService, { provide: PRISMA, useValue: prisma }],
      }).compile();

      const service = moduleRef.get(AuditService);
      await service.record({ action, entite: 'Test' });

      expect(prisma.journalAudit.create).toHaveBeenCalledWith({
        data: {
          action,
          utilisateurId: null,
          entite: 'Test',
          entiteId: null,
          metadonnees: {},
        },
      });
    }
  });
});
