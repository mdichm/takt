// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, Prisma } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { AuditService } from '../../audit/audit.service';
import { RevalidationService } from '../revalidation/revalidation.service';
import {
  buildPrismaQuery,
  ConfigurationRequeteListe,
} from '../../common/pagination/build-prisma-query';
import { construireDonneesPaginees } from '../../common/pagination/pagination-normalizer';
import type {
  AffectationPedagogiqueCreate,
  AffectationPedagogiqueListFilters,
  AffectationPedagogiqueUpdate,
} from '@takt/contracts';

/**
 * Service de gestion des affectations pédagogiques.
 *
 * Une affectation relie un enseignant, une matière et un groupe dans le
 * contexte d'une version de travail, avec un volume horaire hebdomadaire.
 *
 * Règles métier :
 * - L'enseignant doit appartenir au département (via EnseignantDepartement).
 * - Le groupe doit appartenir au département (via Niveau → Parcours → Departement).
 * - Le triplet (enseignant, matière, groupe) est unique dans une version.
 * - Une divergence avec le plan d'études produit un avertissement, jamais un blocage.
 * - Toute mutation est journalisée (GG-07).
 */
@Injectable()
export class AffectationPedagogiqueService {
  private readonly logger = new Logger(AffectationPedagogiqueService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(RevalidationService)
    private readonly revalidationService: RevalidationService,
  ) {}

  /** Liste paginée des affectations, filtrée par département(s). */
  async lister(filtres: AffectationPedagogiqueListFilters, departementIds: string[]) {
    const { page, pageSize, search, sortBy, sortDirection, ...filtresMetier } = filtres;

    // Défauts pour la pagination si non fournis par le pipe Zod
    const pageDefaut = page ?? 1;
    const pageSizeDefaut = pageSize ?? 20;

    const configuration: ConfigurationRequeteListe<
      Record<string, unknown>,
      Partial<Prisma.AffectationPedagogiqueOrderByWithRelationInput>
    > = {
      where: () => {
        const where: Record<string, unknown> = {};
        if (departementIds.length > 0) {
          where.departementId = { in: departementIds };
        }
        if (filtresMetier.versionId) {
          where.versionId = filtresMetier.versionId;
        }
        if (filtresMetier.semestreId) {
          where.semestreId = filtresMetier.semestreId;
        }
        if (filtresMetier.enseignantId) {
          where.enseignantId = filtresMetier.enseignantId;
        }
        if (filtresMetier.matiereId) {
          where.matiereId = filtresMetier.matiereId;
        }
        if (filtresMetier.groupeId) {
          where.groupeId = filtresMetier.groupeId;
        }
        if (filtresMetier.typeEnseignementId) {
          where.typeEnseignementId = filtresMetier.typeEnseignementId;
        }
        return where;
      },
      searchFields: {},
      sortFields: {
        volumeHebdo: (direction: 'asc' | 'desc') => ({
          volumeHebdo: direction,
        }),
        createdAt: (direction: 'asc' | 'desc') => ({
          createdAt: direction,
        }),
        updatedAt: (direction: 'asc' | 'desc') => ({
          updatedAt: direction,
        }),
      },
      defaultSort: () => ({ createdAt: 'desc' }),
    };

    const { where, orderBy, skip, take } = buildPrismaQuery(
      { page: pageDefaut, pageSize: pageSizeDefaut, search, sortBy, sortDirection },
      configuration,
    );

    const [lignes, total] = await Promise.all([
      this.prisma.affectationPedagogique.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          enseignant: { select: { id: true, matricule: true, nom: true, prenom: true } },
          matiere: { select: { id: true, code: true, libelle: true } },
          groupe: { select: { id: true, code: true, libelle: true } },
          typeEnseignement: {
            select: { id: true, code: true, libelle: true },
          },
          version: { select: { id: true, etat: true } },
        },
      }),
      this.prisma.affectationPedagogique.count({ where }),
    ]);

    return construireDonneesPaginees(lignes, total, {
      ...filtres,
      page: pageDefaut,
      pageSize: pageSizeDefaut,
    });
  }

  /** Détail d'une affectation pédagogique par son identifiant. */
  async detail(id: string, departementIds: string[]) {
    const existant = await this.prisma.affectationPedagogique.findUnique({
      where: { id },
      include: {
        enseignant: { select: { id: true, matricule: true, nom: true, prenom: true } },
        matiere: { select: { id: true, code: true, libelle: true } },
        groupe: {
          select: {
            id: true,
            code: true,
            libelle: true,
            niveau: {
              include: {
                parcours: { include: { departement: { select: { id: true } } } },
              },
            },
          },
        },
        typeEnseignement: {
          select: { id: true, code: true, libelle: true },
        },
        version: { select: { id: true, etat: true } },
      },
    });

    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Affectation pédagogique introuvable');
    }

    // Vérification de la portée départementale
    if (departementIds.length > 0 && !departementIds.includes(existant.departementId)) {
      throw new ApiError(
        CODES_ERREUR_API.FORBIDDEN,
        403,
        'Affectation pédagogique hors périmètre départemental',
        { champ: 'departementId' },
      );
    }

    return { affectation: existant };
  }
  /** Crée une affectation pédagogique. */
  async creer(donnees: AffectationPedagogiqueCreate, departementId: string, utilisateurId: string) {
    // Vérifier le groupe et son département (pour déduire departementId si admin/dir)
    const groupe = await this.prisma.groupe.findUnique({
      where: { id: donnees.groupeId },
      include: {
        niveau: {
          include: {
            parcours: { include: { departement: { select: { id: true } } } },
          },
        },
      },
    });
    if (!groupe) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Groupe introuvable', {
        champ: 'groupeId',
      });
    }

    // Si departementId non fourni (admin/dir), le déduire du groupe
    const departementEffectif = departementId || groupe.niveau.parcours.departement.id;

    // Vérifier que le groupe appartient au département effectif
    if (groupe.niveau.parcours.departement.id !== departementEffectif) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        "Le groupe n'appartient pas au département",
        { champ: 'groupeId' },
      );
    }

    // Vérifier l'enseignant
    const enseignant = await this.prisma.enseignant.findUnique({
      where: { id: donnees.enseignantId },
      select: { id: true },
    });
    if (!enseignant) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Enseignant introuvable', {
        champ: 'enseignantId',
      });
    }
    const enseignantDansDepartement = await this.prisma.enseignantDepartement.findFirst({
      where: {
        enseignantId: donnees.enseignantId,
        departementId: departementEffectif,
      },
    });
    if (!enseignantDansDepartement) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        "L'enseignant n'appartient pas au département",
        { champ: 'enseignantId' },
      );
    }

    // Vérifier la matière
    const matiere = await this.prisma.matiere.findUnique({
      where: { id: donnees.matiereId },
      select: { id: true },
    });
    if (!matiere) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Matière introuvable', {
        champ: 'matiereId',
      });
    }

    // Vérifier le type d'enseignement si fourni
    if (donnees.typeEnseignementId !== undefined && donnees.typeEnseignementId !== null) {
      const typeEnseignement = await this.prisma.typeEnseignement.findUnique({
        where: { id: donnees.typeEnseignementId },
        select: { id: true },
      });
      if (!typeEnseignement) {
        throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, "Type d'enseignement introuvable", {
          champ: 'typeEnseignementId',
        });
      }
    }

    // Vérifier l'unicité du triplet
    const doublon = await this.prisma.affectationPedagogique.findFirst({
      where: {
        versionId: donnees.versionId,
        enseignantId: donnees.enseignantId,
        matiereId: donnees.matiereId,
        groupeId: donnees.groupeId,
      },
    });
    if (doublon) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Ce triplet (enseignant, matière, groupe) est déjà affecté dans cette version',
        {
          versionId: donnees.versionId,
          enseignantId: donnees.enseignantId,
          matiereId: donnees.matiereId,
          groupeId: donnees.groupeId,
        },
      );
    }

    // Vérifier la cohérence avec le plan d'études (avertissement uniquement)
    const avertissements: Array<{ code: string; message: string }> = [];
    const planEtudes = await this.prisma.planEtudes.findFirst({
      where: {
        niveauId: groupe.niveauId,
        semestreId: donnees.semestreId,
      },
    });
    if (planEtudes) {
      const planMatiere = await this.prisma.planEtudesMatiere.findFirst({
        where: { planEtudesId: planEtudes.id, matiereId: donnees.matiereId },
      });
      if (planMatiere && planMatiere.volumeHoraire !== donnees.volumeHebdo) {
        avertissements.push({
          code: 'DIVERGENCE_VOLUME',
          message: `Le volume hebdomadaire (${donnees.volumeHebdo}h) diffère du plan d'études (${planMatiere.volumeHoraire}h)`,
        });
      }
    }

    const cree = await this.prisma.affectationPedagogique.create({
      data: {
        versionId: donnees.versionId!,
        semestreId: donnees.semestreId,
        departementId: departementEffectif,
        enseignantId: donnees.enseignantId,
        matiereId: donnees.matiereId,
        groupeId: donnees.groupeId,
        typeEnseignementId: donnees.typeEnseignementId,
        volumeHebdo: donnees.volumeHebdo,
        dureeCreneaux: donnees.dureeCreneaux,
      },
      include: {
        enseignant: { select: { id: true, matricule: true, nom: true, prenom: true } },
        matiere: { select: { id: true, code: true, libelle: true } },
        groupe: { select: { id: true, code: true, libelle: true } },
        typeEnseignement: {
          select: { id: true, code: true, libelle: true },
        },
        version: { select: { id: true, etat: true } },
      },
    });

    await this.auditService.record({
      action: 'CREATION',
      utilisateurId,
      entite: 'AffectationPedagogique',
      entiteId: cree.id,
      metadonnees: {
        versionId: cree.versionId,
        semestreId: cree.semestreId,
        departementId: cree.departementId,
        enseignantId: cree.enseignantId,
        matiereId: cree.matiereId,
        groupeId: cree.groupeId,
        volumeHebdo: cree.volumeHebdo,
        avertissements,
      },
    });

    // Détection automatique des départements impactés (TAKT-L05-05).
    await this.revalidationService.detecterImpacts(cree.versionId, utilisateurId);

    this.logger.log(`Affectation pédagogique créée : ${cree.id}`);

    return { affectation: cree, avertissements };
  }
  /** Met à jour une affectation pédagogique. */
  async mettreAJour(id: string, donnees: AffectationPedagogiqueUpdate, utilisateurId: string) {
    const existant = await this.prisma.affectationPedagogique.findUnique({
      where: { id },
      include: {
        groupe: {
          include: {
            niveau: {
              include: {
                parcours: { include: { departement: { select: { id: true } } } },
              },
            },
          },
        },
      },
    });

    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Affectation pédagogique introuvable');
    }

    const departementId = existant.groupe!.niveau.parcours.departement.id;
    const versionId = donnees.versionId ?? existant.versionId;

    // Vérifier le nouvel enseignant si modifié
    if (donnees.enseignantId !== undefined && donnees.enseignantId !== existant.enseignantId) {
      const enseignant = await this.prisma.enseignant.findUnique({
        where: { id: donnees.enseignantId },
        select: { id: true },
      });
      if (!enseignant) {
        throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Enseignant introuvable', {
          champ: 'enseignantId',
        });
      }
      const enseignantDansDepartement = await this.prisma.enseignantDepartement.findFirst({
        where: {
          enseignantId: donnees.enseignantId,
          departementId,
        },
      });
      if (!enseignantDansDepartement) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          "L'enseignant n'appartient pas au département",
          { champ: 'enseignantId' },
        );
      }
    }

    let groupe = existant.groupe!;
    if (donnees.groupeId !== undefined && donnees.groupeId !== existant.groupeId) {
      const nouveauGroupe = await this.prisma.groupe.findUnique({
        where: { id: donnees.groupeId },
        include: {
          niveau: {
            include: {
              parcours: { include: { departement: { select: { id: true } } } },
            },
          },
        },
      });
      if (!nouveauGroupe) {
        throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Groupe introuvable', {
          champ: 'groupeId',
        });
      }
      if (nouveauGroupe.niveau.parcours.departement.id !== departementId) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          "Le groupe n'appartient pas au département",
          { champ: 'groupeId' },
        );
      }
      groupe = nouveauGroupe;
    }

    if (donnees.matiereId !== undefined && donnees.matiereId !== existant.matiereId) {
      const matiere = await this.prisma.matiere.findUnique({
        where: { id: donnees.matiereId },
        select: { id: true },
      });
      if (!matiere) {
        throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Matière introuvable', {
          champ: 'matiereId',
        });
      }
    }

    if (donnees.typeEnseignementId !== undefined) {
      if (donnees.typeEnseignementId !== null) {
        const typeEnseignement = await this.prisma.typeEnseignement.findUnique({
          where: { id: donnees.typeEnseignementId },
          select: { id: true },
        });
        if (!typeEnseignement) {
          throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, "Type d'enseignement introuvable", {
            champ: 'typeEnseignementId',
          });
        }
      }
    }

    const nouveauEnseignant = donnees.enseignantId ?? existant.enseignantId;
    const nouvelleMatiere = donnees.matiereId ?? existant.matiereId;
    const nouveauGroupe = donnees.groupeId ?? existant.groupeId;
    const doublon = await this.prisma.affectationPedagogique.findFirst({
      where: {
        versionId,
        enseignantId: nouveauEnseignant,
        matiereId: nouvelleMatiere,
        groupeId: nouveauGroupe,
        NOT: { id },
      },
    });
    if (doublon) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Ce triplet (enseignant, matière, groupe) est déjà affecté dans cette version',
        {
          versionId,
          enseignantId: nouveauEnseignant,
          matiereId: nouvelleMatiere,
          groupeId: nouveauGroupe,
        },
      );
    }

    const avertissements: Array<{ code: string; message: string }> = [];
    const nouveauVolume = donnees.volumeHebdo ?? existant.volumeHebdo;
    const planEtudes = await this.prisma.planEtudes.findFirst({
      where: {
        niveauId: groupe.niveauId,
        semestreId: existant.semestreId,
      },
    });
    if (planEtudes) {
      const planMatiere = await this.prisma.planEtudesMatiere.findFirst({
        where: { planEtudesId: planEtudes.id, matiereId: nouvelleMatiere },
      });
      if (planMatiere && planMatiere.volumeHoraire !== nouveauVolume) {
        avertissements.push({
          code: 'DIVERGENCE_VOLUME',
          message: `Le volume hebdomadaire (${nouveauVolume}h) diffère du plan d'études (${planMatiere.volumeHoraire}h)`,
        });
      }
    }

    const modifie = await this.prisma.affectationPedagogique.update({
      where: { id },
      data: {
        ...(donnees.versionId !== undefined && { versionId: donnees.versionId }),
        ...(donnees.semestreId !== undefined && { semestreId: donnees.semestreId }),
        ...(donnees.departementId !== undefined && { departementId: donnees.departementId }),
        ...(donnees.enseignantId !== undefined && { enseignantId: donnees.enseignantId }),
        ...(donnees.matiereId !== undefined && { matiereId: donnees.matiereId }),
        ...(donnees.groupeId !== undefined && { groupeId: donnees.groupeId }),
        ...(donnees.typeEnseignementId !== undefined && {
          typeEnseignementId: donnees.typeEnseignementId,
        }),
        ...(donnees.volumeHebdo !== undefined && { volumeHebdo: donnees.volumeHebdo }),
        ...(donnees.dureeCreneaux !== undefined && { dureeCreneaux: donnees.dureeCreneaux }),
      },
      include: {
        enseignant: { select: { id: true, matricule: true, nom: true, prenom: true } },
        matiere: { select: { id: true, code: true, libelle: true } },
        groupe: { select: { id: true, code: true, libelle: true } },
        typeEnseignement: {
          select: { id: true, code: true, libelle: true },
        },
        version: { select: { id: true, etat: true } },
      },
    });

    await this.auditService.record({
      action: 'MODIFICATION',
      utilisateurId,
      entite: 'AffectationPedagogique',
      entiteId: id,
      metadonnees: {
        versionId,
        semestreId: modifie.semestreId,
        departementId: modifie.departementId,
        enseignantId: modifie.enseignantId,
        matiereId: modifie.matiereId,
        groupeId: modifie.groupeId,
        volumeHebdo: modifie.volumeHebdo,
        avertissements,
      },
    });

    // Détection automatique des départements impactés (TAKT-L05-05).
    await this.revalidationService.detecterImpacts(versionId, utilisateurId);

    this.logger.log(`Affectation pédagogique modifiée : ${id}`);

    return { affectation: modifie, avertissements };
  }
  /** Supprime une affectation pédagogique. */
  async supprimer(id: string, utilisateurId: string) {
    const existant = await this.prisma.affectationPedagogique.findUnique({
      where: { id },
      select: {
        id: true,
        versionId: true,
        semestreId: true,
        departementId: true,
        enseignantId: true,
        matiereId: true,
        groupeId: true,
        volumeHebdo: true,
      },
    });

    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Affectation pédagogique introuvable');
    }

    await this.prisma.affectationPedagogique.delete({ where: { id } });

    await this.auditService.record({
      action: 'SUPPRESSION',
      utilisateurId,
      entite: 'AffectationPedagogique',
      entiteId: id,
      metadonnees: {
        versionId: existant.versionId,
        semestreId: existant.semestreId,
        departementId: existant.departementId,
        enseignantId: existant.enseignantId,
        matiereId: existant.matiereId,
        groupeId: existant.groupeId,
        volumeHebdo: existant.volumeHebdo,
      },
    });

    // Détection automatique des départements impactés (TAKT-L05-05).
    await this.revalidationService.detecterImpacts(existant.versionId, utilisateurId);

    this.logger.log(`Affectation pédagogique supprimée : ${id}`);

    return { id };
  }
  /** Crée des affectations en cascade depuis un plan d'études (un par groupe héritier). */
  async creerCascade(
    donnees: {
      versionId: string;
      planEtudesId: string;
      planEtudesMatiereId: string;
      enseignantId: string;
    },
    departementId: string,
    utilisateurId: string,
  ) {
    const planEtudes = await this.prisma.planEtudes.findUnique({
      where: { id: donnees.planEtudesId },
      select: { id: true, niveauId: true, departementId: true },
    });
    if (!planEtudes) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, "Plan d'études introuvable", {
        champ: 'planEtudesId',
      });
    }
    if (planEtudes.departementId !== departementId) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        "Le plan d'études n'appartient pas au département",
        { champ: 'planEtudesId' },
      );
    }

    const planMatiere = await this.prisma.planEtudesMatiere.findUnique({
      where: { id: donnees.planEtudesMatiereId },
      select: {
        id: true,
        matiereId: true,
        typeEnseignementId: true,
        volumeHoraire: true,
        dureeCreneaux: true,
        planEtudesId: true,
      },
    });
    if (!planMatiere || planMatiere.planEtudesId !== donnees.planEtudesId) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, "Matière du plan d'études introuvable", {
        champ: 'planEtudesMatiereId',
      });
    }

    const groupes = await this.prisma.groupe.findMany({
      where: { niveauId: planEtudes.niveauId },
      select: { id: true, code: true, libelle: true },
    });
    if (groupes.length === 0) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Aucun groupe héritier trouvé pour ce niveau',
      );
    }

    const version = await this.prisma.version.findUnique({
      where: { id: donnees.versionId },
      select: { id: true, semestreId: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable', {
        champ: 'versionId',
      });
    }

    const enseignant = await this.prisma.enseignant.findUnique({
      where: { id: donnees.enseignantId },
      select: { id: true },
    });
    if (!enseignant) {
      throw new ApiError(CODES_ERREUR_API.BAD_REQUEST, 400, 'Enseignant introuvable', {
        champ: 'enseignantId',
      });
    }
    const enseignantDansDepartement = await this.prisma.enseignantDepartement.findFirst({
      where: {
        enseignantId: donnees.enseignantId,
        departementId,
      },
    });
    if (!enseignantDansDepartement) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        "L'enseignant n'appartient pas au département",
        { champ: 'enseignantId' },
      );
    }

    const affectationsCrees = [];
    for (const groupe of groupes) {
      const doublon = await this.prisma.affectationPedagogique.findFirst({
        where: {
          versionId: donnees.versionId,
          enseignantId: donnees.enseignantId,
          matiereId: planMatiere.matiereId,
          groupeId: groupe.id,
        },
      });
      if (doublon) {
        throw new ApiError(
          CODES_ERREUR_API.CONFLICT,
          409,
          'Triplet déjà affecté pour le groupe ' + groupe.code,
          { groupeId: groupe.id },
        );
      }

      const cree = await this.prisma.affectationPedagogique.create({
        data: {
          versionId: donnees.versionId,
          semestreId: version.semestreId,
          departementId,
          enseignantId: donnees.enseignantId,
          matiereId: planMatiere.matiereId,
          groupeId: groupe.id,
          typeEnseignementId: planMatiere.typeEnseignementId,
          volumeHebdo: planMatiere.volumeHoraire,
          dureeCreneaux: planMatiere.dureeCreneaux,
        },
      });

      await this.auditService.record({
        action: 'CREATION',
        utilisateurId,
        entite: 'AffectationPedagogique',
        entiteId: cree.id,
        metadonnees: {
          versionId: donnees.versionId,
          semestreId: version.semestreId,
          departementId,
          enseignantId: donnees.enseignantId,
          matiereId: planMatiere.matiereId,
          groupeId: groupe.id,
          volumeHebdo: planMatiere.volumeHoraire,
          cascade: true,
        },
      });

      affectationsCrees.push(cree);
    }

    // Détection automatique des départements impactés (TAKT-L05-05).
    await this.revalidationService.detecterImpacts(donnees.versionId, utilisateurId);

    this.logger.log(`${affectationsCrees.length} affectations créées en cascade`);

    return { affectations: affectationsCrees, count: affectationsCrees.length };
  }
}
