// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PRISMA } from '../../common/di/prisma.token';
import { PreconditionsService } from './preconditions.service';
import { ConfigSystemeService } from '../../referentiels/config-systeme/config-systeme.service';
import {
  GARDE_COUVERTURE,
  IGardeCouverture,
} from '../../common/di/garde-couverture.token';
import { CODES_ERREUR_API } from '../../common/http/api-error';
import type { PrismaClient } from '@takt/db';
import { TypeVerrou } from '@takt/db';

const VERSION_ID = 'v-123';

let mockVersionFindUnique: ReturnType<typeof vi.fn>;
let mockAffectationFindMany: ReturnType<typeof vi.fn>;
let mockValidationFindFirst: ReturnType<typeof vi.fn>;
let mockDepartementFindUnique: ReturnType<typeof vi.fn>;
let mockVerrouFindMany: ReturnType<typeof vi.fn>;
let mockSalleFindUnique: ReturnType<typeof vi.fn>;
let mockEnseignantFindUnique: ReturnType<typeof vi.fn>;
let mockCreneauFindUnique: ReturnType<typeof vi.fn>;
let mockMatiereFindUnique: ReturnType<typeof vi.fn>;
let mockSeanceCount: ReturnType<typeof vi.fn>;
let mockConfigGetOrCreate: ReturnType<typeof vi.fn>;
let mockCouvertureCalculer: ReturnType<typeof vi.fn>;

const makePrismaMock = () => ({
  version: { findUnique: mockVersionFindUnique },
  affectationPedagogique: { findMany: mockAffectationFindMany },
  validationRepartition: { findFirst: mockValidationFindFirst },
  departement: { findUnique: mockDepartementFindUnique },
  verrouSeance: { findMany: mockVerrouFindMany },
  salle: { findUnique: mockSalleFindUnique },
  enseignant: { findUnique: mockEnseignantFindUnique },
  creneau: { findUnique: mockCreneauFindUnique },
  matiere: { findUnique: mockMatiereFindUnique },
  seance: { count: mockSeanceCount },
});

const makeConfigServiceMock = () => ({
  getOrCreate: mockConfigGetOrCreate,
});

const makeGardeCouvertureMock = () => ({
  calculerCouverture: mockCouvertureCalculer,
});

describe('PreconditionsService (TAKT-L07-07)', () => {
  let service: PreconditionsService;

  beforeEach(async () => {
    mockVersionFindUnique = vi.fn();
    mockAffectationFindMany = vi.fn();
    mockValidationFindFirst = vi.fn();
    mockDepartementFindUnique = vi.fn();
    mockVerrouFindMany = vi.fn();
    mockSalleFindUnique = vi.fn();
    mockEnseignantFindUnique = vi.fn();
    mockCreneauFindUnique = vi.fn();
    mockMatiereFindUnique = vi.fn();
    mockSeanceCount = vi.fn();
    mockConfigGetOrCreate = vi.fn();
    mockCouvertureCalculer = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreconditionsService,
        { provide: PRISMA, useValue: makePrismaMock() },
        { provide: ConfigSystemeService, useValue: makeConfigServiceMock() },
        { provide: GARDE_COUVERTURE, useValue: makeGardeCouvertureMock() },
      ],
    }).compile();

    service = module.get(PreconditionsService);
    vi.clearAllMocks();
  });

  describe('checkGenerationPreconditions', () => {
    it('doit lever une erreur 404 si la version n existe pas', async () => {
      mockVersionFindUnique.mockResolvedValue(null);

      await expect(
        service.checkGenerationPreconditions('inconnu'),
      ).rejects.toMatchObject({
        code: CODES_ERREUR_API.NOT_FOUND,
        status: 404,
      });
    });

    it('doit signaler une violation ETAT_VERSION_INVALIDE si la version est publiee', async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'publie' });
      mockAffectationFindMany.mockResolvedValue([]);
      mockVerrouFindMany.mockResolvedValue([]);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: true,
      });
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: true,
        tauxGlobal: 100,
        seancesOrphelines: [],
        parDepartement: [],
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(false);
      expect(resultat.violations).toHaveLength(1);
      expect(resultat.violations[0]!.code).toBe('ETAT_VERSION_INVALIDE');
    });

    it('doit retourner satisfaites=true quand tous les controles passent', async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
      mockAffectationFindMany.mockResolvedValue([{ departementId: 'd-1' }]);
      mockValidationFindFirst.mockResolvedValue({ id: 'val-1' });
      mockVerrouFindMany.mockResolvedValue([]);
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: true,
        tauxGlobal: 100,
        seancesOrphelines: [],
        parDepartement: [],
      });
      mockSeanceCount.mockResolvedValue(0);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: true,
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(true);
      expect(resultat.violations).toHaveLength(0);
      expect(resultat.avertissements).toHaveLength(0);
    });
  });
    it('doit signaler DEPARTEMENT_NON_VALIDE quand un departement na pas valide sa repartition', async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
      mockAffectationFindMany.mockResolvedValue([
        { departementId: 'd-1' },
        { departementId: 'd-2' },
      ]);
      mockValidationFindFirst
        .mockResolvedValueOnce({ id: 'val-1' })
        .mockResolvedValueOnce(null);
      mockDepartementFindUnique.mockResolvedValue({ id: 'd-2', libelle: 'Maths' });
      mockVerrouFindMany.mockResolvedValue([]);
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: true,
        tauxGlobal: 100,
        seancesOrphelines: [],
        parDepartement: [],
      });
      mockSeanceCount.mockResolvedValue(0);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: true,
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(false);
      expect(resultat.violations).toHaveLength(1);
      expect(resultat.violations[0]!.code).toBe('DEPARTEMENT_NON_VALIDE');
      expect(resultat.violations[0]!.details?.departementsNonValides).toEqual([
        { id: 'd-2', libelle: 'Maths' },
      ]);
    });

    it('doit signaler VERROU_INCOMPATIBLE pour une cible inexistante', async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
      mockAffectationFindMany.mockResolvedValue([]);
      mockVerrouFindMany.mockResolvedValue([
        {
          id: 'vr-1',
          seanceId: 's-1',
          type: TypeVerrou.SALLE,
          valeur: 'salle-inexistante',
          seance: { id: 's-1', jour: 1, creneauDebutId: 'c-1' },
        },
      ]);
      mockSalleFindUnique.mockResolvedValue(null);
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: true,
        tauxGlobal: 100,
        seancesOrphelines: [],
        parDepartement: [],
      });
      mockSeanceCount.mockResolvedValue(0);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: true,
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(false);
      expect(resultat.violations).toHaveLength(1);
      expect(resultat.violations[0]!.code).toBe('VERROU_INCOMPATIBLE');
      expect(resultat.violations[0]!.details?.motif).toBe('REFERENCE_INEXISTANTE');
    });

    it('doit signaler VERROU_INCOMPATIBLE pour un conflit de ressource', async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
      mockAffectationFindMany.mockResolvedValue([]);
      mockVerrouFindMany.mockResolvedValue([
        {
          id: 'vr-1',
          seanceId: 's-1',
          type: TypeVerrou.SALLE,
          valeur: 'salle-A',
          seance: { id: 's-1', jour: 1, creneauDebutId: 'c-1' },
        },
        {
          id: 'vr-2',
          seanceId: 's-2',
          type: TypeVerrou.SALLE,
          valeur: 'salle-A',
          seance: { id: 's-2', jour: 1, creneauDebutId: 'c-1' },
        },
      ]);
      mockSalleFindUnique.mockResolvedValue({ id: 'salle-A' });
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: true,
        tauxGlobal: 100,
        seancesOrphelines: [],
        parDepartement: [],
      });
      mockSeanceCount.mockResolvedValue(0);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: true,
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(false);
      expect(resultat.violations).toHaveLength(1);
      expect(resultat.violations[0]!.code).toBe('VERROU_INCOMPATIBLE');
      expect(resultat.violations[0]!.details?.motif).toBe('CONFLIT_RESSOURCE');
    });
    it('doit signaler COUVERTURE_NON_CONFORME quand la couverture est incomplète', async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
      mockAffectationFindMany.mockResolvedValue([]);
      mockVerrouFindMany.mockResolvedValue([]);
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: false,
        tauxGlobal: 62,
        seancesOrphelines: [{ seanceId: 's-9', motif: 'aucune affectation' }],
        parDepartement: [{ departementId: 'd-1', taux: 62 }],
      });
      mockSeanceCount.mockResolvedValue(0);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: true,
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(false);
      expect(resultat.violations).toHaveLength(1);
      expect(resultat.violations[0]!.code).toBe('COUVERTURE_NON_CONFORME');
    });

    it('doit ajouter un avertissement TAUX_VERROUILLAGE_ELEVE bloquant quand le taux depasse le seuil', async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
      mockAffectationFindMany.mockResolvedValue([]);
      mockVerrouFindMany.mockResolvedValue([]);
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: true,
        tauxGlobal: 100,
        seancesOrphelines: [],
        parDepartement: [],
      });
      mockSeanceCount.mockResolvedValueOnce(100).mockResolvedValueOnce(90);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: true,
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(false);
      expect(resultat.avertissements).toHaveLength(1);
      expect(resultat.avertissements[0]!.code).toBe('TAUX_VERROUILLAGE_ELEVE');
      expect(resultat.avertissements[0]!.bloquant).toBe(true);
    });

    it("ne doit pas bloquer sur un avertissement TAUX_VERROUILLAGE_ELEVE non bloquant", async () => {
      mockVersionFindUnique.mockResolvedValue({ id: VERSION_ID, etat: 'brouillon' });
      mockAffectationFindMany.mockResolvedValue([]);
      mockVerrouFindMany.mockResolvedValue([]);
      mockCouvertureCalculer.mockResolvedValue({
        estConforme: true,
        tauxGlobal: 100,
        seancesOrphelines: [],
        parDepartement: [],
      });
      mockSeanceCount.mockResolvedValueOnce(100).mockResolvedValueOnce(90);
      mockConfigGetOrCreate.mockResolvedValue({
        seuilVerrouillageGeneration: 75,
        avertissementVerrouillageBloquant: false,
      });

      const resultat = await service.checkGenerationPreconditions(VERSION_ID);

      expect(resultat.satisfaites).toBe(true);
      expect(resultat.avertissements).toHaveLength(1);
      expect(resultat.avertissements[0]!.bloquant).toBe(false);
    });
});