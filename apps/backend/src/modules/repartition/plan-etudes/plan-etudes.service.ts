// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import type {
  PlanEtudesCreate,
  PlanEtudesUpdate,
  PlanEtudesListFilters,
  PlanEtudesMatiereCreate,
  PlanEtudesMatiereUpdate,
  PlanEtudesMatiereListFilters,
} from '@takt/contracts';

/**
 * Service de gestion des plans d'études.
 *
 * Un plan d'études appartient à un niveau, pour une année universitaire et un
 * semestre donnés, et porte le département de son parcours pour le RBAC.
 * Chaque mutation est journalisée (GG-07).
 *
 * Héritage : un groupe hérite du plan de son niveau
 * (Groupe → Niveau → PlanEtudes). Aucune FK directe Groupe.planEtudesId n'est
 * créée (TAKT-L05-01).
 */
@Injectable()
export class PlanEtudesService {
  private readonly logger = new Logger(PlanEtudesService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  /** Vérifie la cohérence des relations parcours / niveau / département. */
  private async verifierCohérencePlan(donnees: {
    parcoursId: string;
    niveauId: string;
    departementId: string;
  }): Promise<void> {
    const parcours = await this.prisma.parcours.findUnique({
      where: { id: donnees.parcoursId },
      include: { departement: { select: { id: true } } },
    });
    if (!parcours) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le parcours parent est introuvable',
        { champ: 'parcoursId' },
      );
    }

    const niveau = await this.prisma.niveau.findUnique({
      where: { id: donnees.niveauId },
    });
    if (!niveau) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le niveau parent est introuvable',
        { champ: 'niveauId' },
      );
    }
    if (niveau.parcoursId !== donnees.parcoursId) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le niveau n’appartient pas au parcours spécifié',
        { champ: 'niveauId' },
      );
    }

    if (parcours.departement.id !== donnees.departementId) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le département doit être celui du parcours',
        { champ: 'departementId' },
      );
    }
  }

  /** Vérifie la cohérence année universitaire / semestre. */
  private async verifierCohérenceAnneeSemestre(donnees: {
    anneeUniversitaireId: string;
    semestreId: string;
  }): Promise<void> {
    const semestre = await this.prisma.semestre.findUnique({
      where: { id: donnees.semestreId },
      select: { id: true, anneeUniversitaireId: true },
    });
    if (!semestre) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le semestre est introuvable',
        { champ: 'semestreId' },
      );
    }
    if (semestre.anneeUniversitaireId !== donnees.anneeUniversitaireId) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le semestre n’appartient pas à l’année universitaire spécifiée',
        { champ: 'semestreId' },
      );
    }
  }

  /** Crée un plan d'études. */
  async create(donnees: PlanEtudesCreate, utilisateurIdCreePar: string) {
    await this.verifierCohérencePlan({
      parcoursId: donnees.parcoursId,
      niveauId: donnees.niveauId,
      departementId: donnees.departementId,
    });
    await this.verifierCohérenceAnneeSemestre({
      anneeUniversitaireId: donnees.anneeUniversitaireId,
      semestreId: donnees.semestreId,
    });

    const existant = await this.prisma.planEtudes.findFirst({
      where: {
        niveauId: donnees.niveauId,
        anneeUniversitaireId: donnees.anneeUniversitaireId,
        semestreId: donnees.semestreId,
      },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Un plan d’études existe déjà pour ce niveau, cette année et ce semestre',
        { niveauId: donnees.niveauId },
      );
    }

    const plan = await this.prisma.planEtudes.create({
      data: {
        parcoursId: donnees.parcoursId,
        niveauId: donnees.niveauId,
        anneeUniversitaireId: donnees.anneeUniversitaireId,
        semestreId: donnees.semestreId,
        departementId: donnees.departementId,
      },
      include: {
        niveau: { select: { code: true, libelle: true } },
        parcours: { select: { code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'PlanEtudes',
      entiteId: plan.id,
      metadonnees: {
        parcoursId: plan.parcoursId,
        niveauId: plan.niveauId,
        anneeUniversitaireId: plan.anneeUniversitaireId,
        semestreId: plan.semestreId,
        departementId: plan.departementId,
      },
    });

    this.logger.log(`Plan d’études créé : ${plan.id}`);
    return {
      id: plan.id,
      parcoursId: plan.parcoursId,
      niveauId: plan.niveauId,
      anneeUniversitaireId: plan.anneeUniversitaireId,
      semestreId: plan.semestreId,
      departementId: plan.departementId,
      niveau: plan.niveau,
      parcours: plan.parcours,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /** Liste paginée des plans d'études, filtrée par département si portée rdep. */
  async list(query: PlanEtudesListFilters, departementIds: string[] = []) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let where: Record<string, unknown> = {};
    if (query.search) {
      where = {
        OR: [
          { parcours: { code: { contains: query.search, mode: 'insensitive' as const } } },
          { parcours: { libelle: { contains: query.search, mode: 'insensitive' as const } } },
          { niveau: { code: { contains: query.search, mode: 'insensitive' as const } } },
          { niveau: { libelle: { contains: query.search, mode: 'insensitive' as const } } },
        ],
      };
    }
    if (query.parcoursId) where = { ...where, parcoursId: query.parcoursId };
    if (query.niveauId) where = { ...where, niveauId: query.niveauId };
    if (query.anneeUniversitaireId) {
      where = { ...where, anneeUniversitaireId: query.anneeUniversitaireId };
    }
    if (query.semestreId) where = { ...where, semestreId: query.semestreId };
    if (departementIds.length > 0) {
      where = { ...where, departementId: { in: departementIds } };
    } else if (query.departementId) {
      where = { ...where, departementId: query.departementId };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.planEtudes.findMany({
        where,
        include: {
          niveau: { select: { code: true, libelle: true } },
          parcours: { select: { code: true, libelle: true } },
          _count: { select: { planEtudesMatieres: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.planEtudes.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        parcoursId: p.parcoursId,
        niveauId: p.niveauId,
        anneeUniversitaireId: p.anneeUniversitaireId,
        semestreId: p.semestreId,
        departementId: p.departementId,
        niveau: p.niveau,
        parcours: p.parcours,
        nombreMatieres: p._count.planEtudesMatieres,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère un plan d'études par son ID (404 si absent, 403 hors périmètre). */
  async getOne(id: string, departementIds: string[] = []) {
    const plan = await this.prisma.planEtudes.findUnique({
      where: { id },
      include: {
        niveau: { select: { code: true, libelle: true } },
        parcours: { select: { code: true, libelle: true, departementId: true } },
        planEtudesMatieres: {
          include: {
            matiere: { select: { id: true, code: true, libelle: true, moduleId: true } },
            typeEnseignement: { select: { id: true, code: true, libelle: true } },
          },
          orderBy: { matiere: { code: 'asc' } },
        },
      },
    });
    if (!plan) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Plan d’études introuvable',
      );
    }

    if (departementIds.length > 0 && !departementIds.includes(plan.departementId)) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Ce plan d’études est hors de votre périmètre départemental',
      );
    }

    const volumeTotal = plan.planEtudesMatieres.reduce(
      (acc, m) => acc + m.volumeHoraire,
      0,
    );

    return {
      id: plan.id,
      parcoursId: plan.parcoursId,
      niveauId: plan.niveauId,
      anneeUniversitaireId: plan.anneeUniversitaireId,
      semestreId: plan.semestreId,
      departementId: plan.departementId,
      niveau: plan.niveau,
      parcours: plan.parcours,
      matieres: plan.planEtudesMatieres.map((m) => ({
        id: m.id,
        matiereId: m.matiereId,
        typeEnseignementId: m.typeEnseignementId,
        volumeHoraire: m.volumeHoraire,
        dureeCreneaux: m.dureeCreneaux,
        coefficient: m.coefficient,
        matiere: m.matiere,
        typeEnseignement: m.typeEnseignement,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      volumeTotalHebdomadaire: volumeTotal,
      nombreMatieres: plan.planEtudesMatieres.length,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  /** Met à jour un plan d'études. */
  async update(
    id: string,
    donnees: PlanEtudesUpdate,
    utilisateurIdModifiePar: string,
  ) {
    const existant = await this.prisma.planEtudes.findUnique({ where: { id } });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Plan d’études introuvable',
      );
    }

    const parcoursId = donnees.parcoursId ?? existant.parcoursId;
    const niveauId = donnees.niveauId ?? existant.niveauId;
    const departementId = donnees.departementId ?? existant.departementId;
    const anneeUniversitaireId =
      donnees.anneeUniversitaireId ?? existant.anneeUniversitaireId;
    const semestreId = donnees.semestreId ?? existant.semestreId;

    await this.verifierCohérencePlan({ parcoursId, niveauId, departementId });
    await this.verifierCohérenceAnneeSemestre({
      anneeUniversitaireId,
      semestreId,
    });

    if (
      niveauId !== existant.niveauId ||
      anneeUniversitaireId !== existant.anneeUniversitaireId ||
      semestreId !== existant.semestreId
    ) {
      const doublon = await this.prisma.planEtudes.findFirst({
        where: { niveauId, anneeUniversitaireId, semestreId },
      });
      if (doublon) {
        throw new ApiError(
          CODES_ERREUR_API.CONFLICT,
          409,
          'Un plan d’études existe déjà pour ce niveau, cette année et ce semestre',
          { niveauId },
        );
      }
    }

    const modifie = await this.prisma.planEtudes.update({
      where: { id },
      data: {
        ...(donnees.parcoursId !== undefined && { parcoursId }),
        ...(donnees.niveauId !== undefined && { niveauId }),
        ...(donnees.anneeUniversitaireId !== undefined && {
          anneeUniversitaireId,
        }),
        ...(donnees.semestreId !== undefined && { semestreId }),
        ...(donnees.departementId !== undefined && { departementId }),
      },
      include: {
        niveau: { select: { code: true, libelle: true } },
        parcours: { select: { code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'PlanEtudes',
      entiteId: id,
      metadonnees: {
        parcoursId: modifie.parcoursId,
        niveauId: modifie.niveauId,
        departementId: modifie.departementId,
      },
    });

    this.logger.log(`Plan d’études modifié : ${modifie.id}`);
    return {
      id: modifie.id,
      parcoursId: modifie.parcoursId,
      niveauId: modifie.niveauId,
      anneeUniversitaireId: modifie.anneeUniversitaireId,
      semestreId: modifie.semestreId,
      departementId: modifie.departementId,
      niveau: modifie.niveau,
      parcours: modifie.parcours,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime un plan d'études (409 s'il contient des matières). */
  async delete(id: string, utilisateurIdSupprimePar: string) {
    const existant = await this.prisma.planEtudes.findUnique({
      where: { id },
      include: { planEtudesMatieres: { take: 1 } },
    });
    if (!existant) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Plan d’études introuvable',
      );
    }

    if (existant.planEtudesMatieres.length > 0) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Impossible de supprimer un plan d’études comportant des matières',
        { matieres: existant.planEtudesMatieres.length },
      );
    }

    await this.prisma.planEtudes.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'PlanEtudes',
      entiteId: id,
      metadonnees: { niveauId: existant.niveauId },
    });

    this.logger.log(`Plan d’études supprimé : ${existant.id}`);
    return { id };
  }

  /** Volume total hebdomadaire d'un plan d'études. */
  async volumeTotal(id: string) {
    const plan = await this.prisma.planEtudes.findUnique({
      where: { id },
      select: {
        id: true,
        planEtudesMatieres: { select: { volumeHoraire: true } },
      },
    });
    if (!plan) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Plan d’études introuvable',
      );
    }

    const volumeTotal = plan.planEtudesMatieres.reduce(
      (acc, m) => acc + m.volumeHoraire,
      0,
    );

    return {
      planEtudesId: plan.id,
      volumeTotalHebdomadaire: volumeTotal,
      nombreMatieres: plan.planEtudesMatieres.length,
    };
  }

  /** Groupes héritant du plan via leur niveau. */
  async groupesHerites(id: string) {
    const plan = await this.prisma.planEtudes.findUnique({
      where: { id },
      select: { id: true, niveauId: true },
    });
    if (!plan) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Plan d’études introuvable',
      );
    }

    const groupes = await this.prisma.groupe.findMany({
      where: { niveauId: plan.niveauId },
      orderBy: [{ code: 'asc' }],
    });

    return groupes.map((g) => ({
      id: g.id,
      code: g.code,
      libelle: g.libelle,
      niveauId: g.niveauId,
      estHéritier: true,
    }));
  }

  /* ── Matières d'un plan d'études ── */

  /** Ajoute une matière à un plan d'études. */
  async ajouterMatiere(
    planEtudesId: string,
    donnees: PlanEtudesMatiereCreate,
    utilisateurIdCreePar: string,
  ) {
    const plan = await this.prisma.planEtudes.findUnique({
      where: { id: planEtudesId },
      select: { id: true },
    });
    if (!plan) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Plan d’études introuvable',
      );
    }

    const matiere = await this.prisma.matiere.findUnique({
      where: { id: donnees.matiereId },
      select: { id: true, code: true, libelle: true },
    });
    if (!matiere) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'La matière est introuvable',
        { champ: 'matiereId' },
      );
    }

    const typeEnseignement = await this.prisma.typeEnseignement.findUnique({
      where: { id: donnees.typeEnseignementId },
      select: { id: true },
    });
    if (!typeEnseignement) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le type d’enseignement est introuvable',
        { champ: 'typeEnseignementId' },
      );
    }

    const existant = await this.prisma.planEtudesMatiere.findFirst({
      where: { planEtudesId, matiereId: donnees.matiereId },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Cette matière est déjà présente dans le plan d’études',
        { matiereId: donnees.matiereId },
      );
    }

    const ligne = await this.prisma.planEtudesMatiere.create({
      data: {
        planEtudesId,
        matiereId: donnees.matiereId,
        typeEnseignementId: donnees.typeEnseignementId,
        volumeHoraire: donnees.volumeHoraire,
        dureeCreneaux: donnees.dureeCreneaux,
        coefficient: donnees.coefficient,
      },
      include: {
        matiere: { select: { id: true, code: true, libelle: true } },
        typeEnseignement: { select: { id: true, code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId: utilisateurIdCreePar,
      entite: 'PlanEtudesMatiere',
      entiteId: ligne.id,
      metadonnees: {
        planEtudesId,
        matiereId: ligne.matiereId,
        typeEnseignementId: ligne.typeEnseignementId,
        volumeHoraire: ligne.volumeHoraire,
      },
    });

    this.logger.log(`Matière ajoutée au plan d’études : ${ligne.id}`);
    return {
      id: ligne.id,
      planEtudesId: ligne.planEtudesId,
      matiereId: ligne.matiereId,
      typeEnseignementId: ligne.typeEnseignementId,
      volumeHoraire: ligne.volumeHoraire,
      dureeCreneaux: ligne.dureeCreneaux,
      coefficient: ligne.coefficient,
      matiere: ligne.matiere,
      typeEnseignement: ligne.typeEnseignement,
      createdAt: ligne.createdAt,
      updatedAt: ligne.updatedAt,
    };
  }

  /** Liste paginée des matières d'un plan d'études. */
  async listMatieres(planEtudesId: string, query: PlanEtudesMatiereListFilters) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const plan = await this.prisma.planEtudes.findUnique({
      where: { id: planEtudesId },
      select: { id: true },
    });
    if (!plan) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Plan d’études introuvable',
      );
    }

    let where: Record<string, unknown> = { planEtudesId };
    if (query.matiereId) where = { ...where, matiereId: query.matiereId };
    if (query.typeEnseignementId) {
      where = { ...where, typeEnseignementId: query.typeEnseignementId };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.planEtudesMatiere.findMany({
        where,
        include: {
          matiere: { select: { id: true, code: true, libelle: true, moduleId: true } },
          typeEnseignement: { select: { id: true, code: true, libelle: true } },
        },
        orderBy: [{ matiere: { code: 'asc' } }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.planEtudesMatiere.count({ where }),
    ]);

    return {
      items: items.map((l) => ({
        id: l.id,
        planEtudesId: l.planEtudesId,
        matiereId: l.matiereId,
        typeEnseignementId: l.typeEnseignementId,
        volumeHoraire: l.volumeHoraire,
        dureeCreneaux: l.dureeCreneaux,
        coefficient: l.coefficient,
        matiere: l.matiere,
        typeEnseignement: l.typeEnseignement,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
      meta: { page, pageSize, total },
    };
  }

  /** Récupère une matière d'un plan d'études par son ID. */
  async getMatiere(planEtudesId: string, id: string) {
    const ligne = await this.prisma.planEtudesMatiere.findUnique({
      where: { id },
      include: {
        matiere: { select: { id: true, code: true, libelle: true, moduleId: true } },
        typeEnseignement: { select: { id: true, code: true, libelle: true } },
      },
    });
    if (!ligne || ligne.planEtudesId !== planEtudesId) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Matière du plan d’études introuvable',
      );
    }
    return {
      id: ligne.id,
      planEtudesId: ligne.planEtudesId,
      matiereId: ligne.matiereId,
      typeEnseignementId: ligne.typeEnseignementId,
      volumeHoraire: ligne.volumeHoraire,
      dureeCreneaux: ligne.dureeCreneaux,
      coefficient: ligne.coefficient,
      matiere: ligne.matiere,
      typeEnseignement: ligne.typeEnseignement,
      createdAt: ligne.createdAt,
      updatedAt: ligne.updatedAt,
    };
  }

  /** Modifie une matière d'un plan d'études. */
  async updateMatiere(
    planEtudesId: string,
    id: string,
    donnees: PlanEtudesMatiereUpdate,
    utilisateurIdModifiePar: string,
  ) {
    const existant = await this.prisma.planEtudesMatiere.findUnique({
      where: { id },
    });
    if (!existant || existant.planEtudesId !== planEtudesId) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Matière du plan d’études introuvable',
      );
    }

    if (
      donnees.matiereId !== undefined &&
      donnees.matiereId !== existant.matiereId
    ) {
      const matiere = await this.prisma.matiere.findUnique({
        where: { id: donnees.matiereId },
      });
      if (!matiere) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'La matière est introuvable',
          { champ: 'matiereId' },
        );
      }
      const doublon = await this.prisma.planEtudesMatiere.findFirst({
        where: { planEtudesId, matiereId: donnees.matiereId },
      });
      if (doublon) {
        throw new ApiError(
          CODES_ERREUR_API.CONFLICT,
          409,
          'Cette matière est déjà présente dans le plan d’études',
          { matiereId: donnees.matiereId },
        );
      }
    }

    if (donnees.typeEnseignementId !== undefined) {
      const typeEnseignement = await this.prisma.typeEnseignement.findUnique({
        where: { id: donnees.typeEnseignementId },
      });
      if (!typeEnseignement) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le type d’enseignement est introuvable',
          { champ: 'typeEnseignementId' },
        );
      }
    }

    const modifie = await this.prisma.planEtudesMatiere.update({
      where: { id },
      data: {
        ...(donnees.matiereId !== undefined && {
          matiereId: donnees.matiereId,
        }),
        ...(donnees.typeEnseignementId !== undefined && {
          typeEnseignementId: donnees.typeEnseignementId,
        }),
        ...(donnees.volumeHoraire !== undefined && {
          volumeHoraire: donnees.volumeHoraire,
        }),
        ...(donnees.dureeCreneaux !== undefined && {
          dureeCreneaux: donnees.dureeCreneaux,
        }),
        ...(donnees.coefficient !== undefined && {
          coefficient: donnees.coefficient,
        }),
      },
      include: {
        matiere: { select: { id: true, code: true, libelle: true } },
        typeEnseignement: { select: { id: true, code: true, libelle: true } },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId: utilisateurIdModifiePar,
      entite: 'PlanEtudesMatiere',
      entiteId: id,
      metadonnees: {
        planEtudesId,
        matiereId: modifie.matiereId,
        volumeHoraire: modifie.volumeHoraire,
      },
    });

    this.logger.log(`Matière du plan d’études modifiée : ${id}`);
    return {
      id: modifie.id,
      planEtudesId: modifie.planEtudesId,
      matiereId: modifie.matiereId,
      typeEnseignementId: modifie.typeEnseignementId,
      volumeHoraire: modifie.volumeHoraire,
      dureeCreneaux: modifie.dureeCreneaux,
      coefficient: modifie.coefficient,
      matiere: modifie.matiere,
      typeEnseignement: modifie.typeEnseignement,
      createdAt: modifie.createdAt,
      updatedAt: modifie.updatedAt,
    };
  }

  /** Supprime une matière d'un plan d'études. */
  async deleteMatiere(
    planEtudesId: string,
    id: string,
    utilisateurIdSupprimePar: string,
  ) {
    const existant = await this.prisma.planEtudesMatiere.findUnique({
      where: { id },
    });
    if (!existant || existant.planEtudesId !== planEtudesId) {
      throw new ApiError(
        CODES_ERREUR_API.NOT_FOUND,
        404,
        'Matière du plan d’études introuvable',
      );
    }

    await this.prisma.planEtudesMatiere.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId: utilisateurIdSupprimePar,
      entite: 'PlanEtudesMatiere',
      entiteId: id,
      metadonnees: {
        planEtudesId,
        matiereId: existant.matiereId,
      },
    });

    this.logger.log(`Matière du plan d’études supprimée : ${id}`);
    return { id };
  }
}