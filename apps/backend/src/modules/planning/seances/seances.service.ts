// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, Prisma } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import { buildPrismaQuery, ConfigurationRequeteListe } from '../../common/pagination/build-prisma-query';
import { construireDonneesPaginees } from '../../common/pagination/pagination-normalizer';
import type {
  SeanceCreateInput,
  SeanceUpdateInput,
  SeanceListFilters,
  SeanceParams,
} from '@takt/contracts';

@Injectable()
export class SeancesService {
  private readonly logger = new Logger(SeancesService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
  ) {}

  /** Liste paginée des séances d'une version (optimisée pour la grille). */
  async lister(filtres: SeanceListFilters) {
    const { page, pageSize, sortBy, sortDirection, ...filtresMetier } = filtres;

    const pageDefaut = page ?? 1;
    const pageSizeDefaut = pageSize ?? 20;

    const configuration: ConfigurationRequeteListe<
      Record<string, unknown>,
      Partial<Prisma.SeanceOrderByWithRelationInput>
    > = {
      where: () => {
        const where: Record<string, unknown> = {};
        if (filtresMetier.versionId) {
          where.versionId = filtresMetier.versionId;
        }
        if (filtresMetier.jour) {
          where.jour = filtresMetier.jour;
        }
        if (filtresMetier.salleId) {
          where.salleId = filtresMetier.salleId;
        }
        if (filtresMetier.enseignantId) {
          where.enseignantId = filtresMetier.enseignantId;
        }
        if (filtresMetier.groupeId) {
          where.groupeId = filtresMetier.groupeId;
        }
        if (filtresMetier.matiereId) {
          where.matiereId = filtresMetier.matiereId;
        }
        if (filtresMetier.typeEnseignementId) {
          where.typeEnseignementId = filtresMetier.typeEnseignementId;
        }
        if (filtresMetier.affectationId) {
          where.affectationId = filtresMetier.affectationId;
        }
        if (filtresMetier.estVerrouillee !== undefined) {
          where.estVerrouillee = filtresMetier.estVerrouillee;
        }
        return where;
      },
      searchFields: {},
      sortFields: {
        jour: (direction: 'asc' | 'desc') => ({ jour: direction }),
        createdAt: (direction: 'asc' | 'desc') => ({ createdAt: direction }),
        updatedAt: (direction: 'asc' | 'desc') => ({ updatedAt: direction }),
      },
      defaultSort: () => ({ jour: 'asc', creneauDebutId: 'asc' }),
    };

    const { where, orderBy, skip, take } = buildPrismaQuery(
      {
        page: pageDefaut,
        pageSize: pageSizeDefaut,
        sortBy,
        sortDirection,
      },
      configuration,
    );

    const [items, total] = await this.prisma.$transaction([
      this.prisma.seance.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          versionId: true,
          jour: true,
          creneauDebutId: true,
          nbCreneaux: true,
          salleId: true,
          enseignantId: true,
          groupeId: true,
          matiereId: true,
          typeEnseignementId: true,
          affectationId: true,
          estVerrouillee: true,
          createdAt: true,
          updatedAt: true,
          creneauDebut: {
            select: { id: true, jour: true, ordre: true, heureDebut: true, heureFin: true },
          },
          salle: { select: { id: true, code: true, libelle: true, capacite: true } },
          enseignant: { select: { id: true, matricule: true, nom: true, prenom: true } },
          groupe: { select: { id: true, code: true, libelle: true } },
          matiere: { select: { id: true, code: true, libelle: true } },
          typeEnseignement: { select: { id: true, code: true, libelle: true } },
        },
      }),
      this.prisma.seance.count({ where }),
    ]);

    return construireDonneesPaginees(items, total, {
      page: pageDefaut,
      pageSize: pageSizeDefaut,
    });
  }

  /** Détail d'une séance par son ID. */
  async obtenir(params: SeanceParams) {
    const seance = await this.prisma.seance.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        versionId: true,
        jour: true,
        creneauDebutId: true,
        nbCreneaux: true,
        salleId: true,
        enseignantId: true,
        groupeId: true,
        matiereId: true,
        typeEnseignementId: true,
        affectationId: true,
        estVerrouillee: true,
        createdAt: true,
        updatedAt: true,
        creneauDebut: {
          select: { id: true, jour: true, ordre: true, heureDebut: true, heureFin: true },
        },
        salle: { select: { id: true, code: true, libelle: true, capacite: true } },
        enseignant: { select: { id: true, matricule: true, nom: true, prenom: true } },
        groupe: { select: { id: true, code: true, libelle: true } },
        matiere: { select: { id: true, code: true, libelle: true } },
        typeEnseignement: { select: { id: true, code: true, libelle: true } },
        affectation: {
          select: {
            id: true,
            versionId: true,
            enseignantId: true,
            matiereId: true,
            groupeId: true,
            typeEnseignementId: true,
            volumeHebdo: true,
            dureeCreneaux: true,
          },
        },
      },
    });

    if (!seance) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Séance introuvable');
    }

    return seance;
  }

  /** Vérifie qu'une version n'est pas publiée (immuabilité EX-PRI-02). */
  private async verifierVersionModifiable(versionId: string): Promise<void> {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { id: true, etat: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    if (version.etat === 'publie') {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        'Une version publiée est immuable',
        { versionId, etat: version.etat },
      );
    }
  }

  /** Vérifie que l'affectation existe et appartient à la même version (TE-MET-03). */
  private async verifierAffectation(
    affectationId: string,
    versionId: string,
  ): Promise<Prisma.AffectationPedagogiqueGetPayload<object>> {
    const affectation = await this.prisma.affectationPedagogique.findUnique({
      where: { id: affectationId },
    });
    if (!affectation) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'L’affectation pédagogique spécifiée est introuvable',
        { champ: 'affectationId' },
      );
    }
    if (affectation.versionId !== versionId) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        "L'affectation pédagogique n'appartient pas à cette version",
        { champ: 'affectationId', versionId },
      );
    }
    return affectation as Prisma.AffectationPedagogiqueGetPayload<object>;
  }

  /** Vérifie que le créneau de début existe et correspond au jour demandé. */
  private async verifierCreneauDebut(
    creneauDebutId: string,
    jour: number,
  ): Promise<Prisma.CreneauGetPayload<object>> {
    const creneau = await this.prisma.creneau.findUnique({
      where: { id: creneauDebutId },
    });
    if (!creneau) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le créneau de début spécifié est introuvable',
        { champ: 'creneauDebutId' },
      );
    }
    if (creneau.jour !== jour) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        "Le créneau de début ne correspond pas au jour demandé",
        { champ: 'creneauDebutId', jour },
      );
    }
    return creneau as Prisma.CreneauGetPayload<object>;
  }

  /** Vérifie que les nbCreneaux créneaux consécutifs existent à partir du créneau de début. */
  private async verifierCreneauxConsecutifs(
    jour: number,
    ordreDebut: number,
    nbCreneaux: number,
  ): Promise<void> {
    for (let i = 0; i < nbCreneaux; i++) {
      const creneau = await this.prisma.creneau.findFirst({
        where: { jour, ordre: ordreDebut + i },
      });
      if (!creneau) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          `Le créneau d'ordre ${ordreDebut + i} n'existe pas pour le jour ${jour}`,
          { champ: 'creneauDebutId', nbCreneaux },
        );
      }
    }
  }

  /** Vérifie la règle de couverture : durée de la séance ≤ volume de l'affectation. */
  private async verifierCouverture(
    affectation: Prisma.AffectationPedagogiqueGetPayload<object>,
    nbCreneaux: number,
    dureeCreneauMinutes: number,
  ): Promise<void> {
    const dureeSeanceMinutes = nbCreneaux * dureeCreneauMinutes;
    const volumeMinutes = affectation.volumeHebdo * 60;

    if (dureeSeanceMinutes > volumeMinutes) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'La durée de la séance dépasse le volume horaire de l’affectation',
        {
          champ: 'nbCreneaux',
          dureeSeanceMinutes,
          volumeHebdo: affectation.volumeHebdo,
          volumeMinutes,
        },
      );
    }
  }

  /** Crée une séance (POST /api/v1/seances). */
  async creer(donnees: SeanceCreateInput, utilisateurId: string) {
    // 1. Version modifiable
    await this.verifierVersionModifiable(donnees.versionId);

    // 2. Affectation valide et de la même version
    const affectation = await this.verifierAffectation(
      donnees.affectationId,
      donnees.versionId,
    );

    // 3. Créneau de début valide pour le jour
    const creneauDebut = await this.verifierCreneauDebut(
      donnees.creneauDebutId,
      donnees.jour,
    );

    // 4. Créneaux consécutifs
    await this.verifierCreneauxConsecutifs(
      donnees.jour,
      creneauDebut.ordre,
      donnees.nbCreneaux,
    );

    // 5. Référentiels optionnels s'ils sont fournis
    if (donnees.salleId) {
      const salle = await this.prisma.salle.findUnique({
        where: { id: donnees.salleId },
        select: { id: true },
      });
      if (!salle) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Salle introuvable',
          { champ: 'salleId' },
        );
      }
    }
    if (donnees.enseignantId) {
      const enseignant = await this.prisma.enseignant.findUnique({
        where: { id: donnees.enseignantId },
        select: { id: true },
      });
      if (!enseignant) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Enseignant introuvable',
          { champ: 'enseignantId' },
        );
      }
    }
    if (donnees.groupeId) {
      const groupe = await this.prisma.groupe.findUnique({
        where: { id: donnees.groupeId },
        select: { id: true },
      });
      if (!groupe) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Groupe introuvable',
          { champ: 'groupeId' },
        );
      }
    }
    if (donnees.matiereId) {
      const matiere = await this.prisma.matiere.findUnique({
        where: { id: donnees.matiereId },
        select: { id: true },
      });
      if (!matiere) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Matière introuvable',
          { champ: 'matiereId' },
        );
      }
    }
    if (donnees.typeEnseignementId) {
      const typeEnseignement = await this.prisma.typeEnseignement.findUnique({
        where: { id: donnees.typeEnseignementId },
        select: { id: true },
      });
      if (!typeEnseignement) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Type d’enseignement introuvable',
          { champ: 'typeEnseignementId' },
        );
      }
    }

    // 6. Règle de couverture
    const dureeCreneauMinutes = creneauDebut.heureFin
      ? Math.round(
          (creneauDebut.heureFin.getTime() - creneauDebut.heureDebut.getTime()) /
            (1000 * 60),
        )
      : 30;
    await this.verifierCouverture(affectation, donnees.nbCreneaux, dureeCreneauMinutes);

    // 7. Création de la séance
    const seance = await this.prisma.seance.create({
      data: {
        versionId: donnees.versionId,
        jour: donnees.jour,
        creneauDebutId: donnees.creneauDebutId,
        nbCreneaux: donnees.nbCreneaux,
        salleId: donnees.salleId ?? null,
        enseignantId: donnees.enseignantId ?? null,
        groupeId: donnees.groupeId ?? null,
        matiereId: donnees.matiereId ?? null,
        typeEnseignementId: donnees.typeEnseignementId ?? null,
        affectationId: donnees.affectationId,
        estVerrouillee: false,
      },
      select: {
        id: true,
        versionId: true,
        jour: true,
        creneauDebutId: true,
        nbCreneaux: true,
        salleId: true,
        enseignantId: true,
        groupeId: true,
        matiereId: true,
        typeEnseignementId: true,
        affectationId: true,
        estVerrouillee: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 8. Audit (GG-07)
    await this.prisma.journalAudit.create({
      data: {
        action: 'CREATION',
        utilisateurId,
        entite: 'Seance',
        entiteId: seance.id,
        metadonnees: {
          versionId: seance.versionId,
          jour: seance.jour,
          creneauDebutId: seance.creneauDebutId,
          nbCreneaux: seance.nbCreneaux,
          salleId: seance.salleId,
          enseignantId: seance.enseignantId,
          groupeId: seance.groupeId,
          matiereId: seance.matiereId,
          typeEnseignementId: seance.typeEnseignementId,
          affectationId: seance.affectationId,
        },
      },
    });

    this.logger.log(`Séance créée : ${seance.id} (version ${donnees.versionId})`);
    return seance;
  }

  /** Met à jour une séance (PUT/PATCH /api/v1/seances/:id). */
  async mettreAJour(
    id: string,
    donnees: SeanceUpdateInput,
    utilisateurId: string,
  ) {
    // 1. Séance existante
    const existant = await this.prisma.seance.findUnique({
      where: { id },
      select: {
        id: true,
        versionId: true,
        jour: true,
        creneauDebutId: true,
        nbCreneaux: true,
        salleId: true,
        enseignantId: true,
        groupeId: true,
        matiereId: true,
        typeEnseignementId: true,
        affectationId: true,
      },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Séance introuvable');
    }

    // 2. Version modifiable
    await this.verifierVersionModifiable(existant.versionId);

    // 3. Déterminer les valeurs finales après mise à jour
    const versionId = existant.versionId;
    const jour = donnees.jour ?? existant.jour;
    const creneauDebutId = donnees.creneauDebutId ?? existant.creneauDebutId;
    const nbCreneaux = donnees.nbCreneaux ?? existant.nbCreneaux;
    const affectationId = donnees.affectationId ?? existant.affectationId;

    // 4. Affectation valide et de la même version (si modifiée)
    if (donnees.affectationId !== undefined) {
      await this.verifierAffectation(affectationId, versionId);
    } else {
      const affectation = await this.prisma.affectationPedagogique.findUnique({
        where: { id: affectationId },
        select: { id: true, versionId: true },
      });
      if (!affectation || affectation.versionId !== versionId) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          "L'affectation pédagogique n'appartient pas à cette version",
          { champ: 'affectationId', versionId },
        );
      }
    }

    // 5. Créneau de début valide pour le jour (si modifiés)
    if (donnees.creneauDebutId !== undefined || donnees.jour !== undefined) {
      const creneauDebut = await this.verifierCreneauDebut(creneauDebutId, jour);
      // 6. Créneaux consécutifs
      await this.verifierCreneauxConsecutifs(jour, creneauDebut.ordre, nbCreneaux);

      // 7. Règle de couverture
      const affectation = await this.prisma.affectationPedagogique.findUnique({
        where: { id: affectationId },
        select: { volumeHebdo: true },
      });
      const dureeCreneauMinutes = creneauDebut.heureFin
        ? Math.round(
            (creneauDebut.heureFin.getTime() - creneauDebut.heureDebut.getTime()) /
              (1000 * 60),
          )
        : 30;
      if (affectation) {
        await this.verifierCouverture(
          affectation as Prisma.AffectationPedagogiqueGetPayload<object>,
          nbCreneaux,
          dureeCreneauMinutes,
        );
      }
    }

    // 8. Référentiels optionnels s'ils sont fournis
    const updateData: Record<string, unknown> = {};
    if (donnees.jour !== undefined) updateData.jour = donnees.jour;
    if (donnees.creneauDebutId !== undefined) updateData.creneauDebutId = donnees.creneauDebutId;
    if (donnees.nbCreneaux !== undefined) updateData.nbCreneaux = donnees.nbCreneaux;
    if (donnees.salleId !== undefined) updateData.salleId = donnees.salleId ?? null;
    if (donnees.enseignantId !== undefined)
      updateData.enseignantId = donnees.enseignantId ?? null;
    if (donnees.groupeId !== undefined) updateData.groupeId = donnees.groupeId ?? null;
    if (donnees.matiereId !== undefined) updateData.matiereId = donnees.matiereId ?? null;
    if (donnees.typeEnseignementId !== undefined)
      updateData.typeEnseignementId = donnees.typeEnseignementId ?? null;
    if (donnees.affectationId !== undefined)
      updateData.affectationId = donnees.affectationId;

    // 9. Mise à jour
    const modifiee = await this.prisma.seance.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        versionId: true,
        jour: true,
        creneauDebutId: true,
        nbCreneaux: true,
        salleId: true,
        enseignantId: true,
        groupeId: true,
        matiereId: true,
        typeEnseignementId: true,
        affectationId: true,
        estVerrouillee: true,
        updatedAt: true,
      },
    });

    // 10. Audit (GG-07)
    await this.prisma.journalAudit.create({
      data: {
        action: 'MODIFICATION',
        utilisateurId,
        entite: 'Seance',
        entiteId: id,
        metadonnees: {
          versionId: modifiee.versionId,
          jour: modifiee.jour,
          creneauDebutId: modifiee.creneauDebutId,
          nbCreneaux: modifiee.nbCreneaux,
          salleId: modifiee.salleId,
          enseignantId: modifiee.enseignantId,
          groupeId: modifiee.groupeId,
          matiereId: modifiee.matiereId,
          typeEnseignementId: modifiee.typeEnseignementId,
          affectationId: modifiee.affectationId,
          champsModifies: Object.keys(updateData),
        },
      },
    });

    this.logger.log(`Séance modifiée : ${id}`);
    return modifiee;
  }

  /** Supprime une séance (DELETE /api/v1/seances/:id). */
  async supprimer(id: string, utilisateurId: string) {
    // 1. Séance existante
    const existant = await this.prisma.seance.findUnique({
      where: { id },
      select: {
        id: true,
        versionId: true,
        jour: true,
        creneauDebutId: true,
        nbCreneaux: true,
        affectationId: true,
      },
    });
    if (!existant) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Séance introuvable');
    }

    // 2. Version modifiable
    await this.verifierVersionModifiable(existant.versionId);

    // 3. Suppression
    await this.prisma.seance.delete({ where: { id } });

    // 4. Audit (GG-07)
    await this.prisma.journalAudit.create({
      data: {
        action: 'SUPPRESSION',
        utilisateurId,
        entite: 'Seance',
        entiteId: id,
        metadonnees: {
          versionId: existant.versionId,
          jour: existant.jour,
          creneauDebutId: existant.creneauDebutId,
          nbCreneaux: existant.nbCreneaux,
          affectationId: existant.affectationId,
        },
      },
    });

    this.logger.log(`Séance supprimée : ${id}`);
    return { id };
  }
}