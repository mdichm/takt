// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../common/di/prisma.token';
import { PrismaClient } from '@takt/db';
import { hash as hacherArgon2 } from 'argon2';
import { PASSWORD_ARGON2_OPTIONS } from '../../config/password.config';
import {
  CODES_ERREUR_API,
  ApiError,
} from '../common/http/api-error';
import { appliquerFiltreDepartement } from '../common/rbac/filtre-departement.util';

/**
 * Service de gestion des utilisateurs et de leurs rôles.
 *
 * Permet à l'admin de créer, lister, modifier et désactiver des comptes,
 * et d'attribuer un rôle (et un département pour les rdep) à chaque utilisateur.
 * Chaque mutation est journalisée (GG-07).
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** Rôle administrateur, protégé contre la désactivation par soi-même. */
  private static readonly ROLE_ADMIN = 'admin';

  /** Crée un nouvel utilisateur avec son rôle et son département optionnel. */
  async createUser(donnees: {
    email: string;
    nom: string;
    prenom: string;
    roleId: string;
    departementId: string | null;
    motDePasse: string;
    estActif?: boolean;
    utilisateurIdCreePar: string;
  }) {
    const existant = await this.prisma.utilisateur.findUnique({
      where: { email: donnees.email },
    });
    if (existant) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Un utilisateur avec cet e-mail existe déjà',
        { champ: 'email' },
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { id: donnees.roleId },
    });
    if (!role) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Le rôle spécifié est introuvable',
        { champ: 'roleId' },
      );
    }

    if (donnees.departementId) {
      const departement = await this.prisma.departement.findUnique({
        where: { id: donnees.departementId },
      });
      if (!departement) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le département spécifié est introuvable',
          { champ: 'departementId' },
        );
      }
    }

    const hash = await hacherArgon2(donnees.motDePasse, PASSWORD_ARGON2_OPTIONS);
    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        email: donnees.email,
        nom: donnees.nom,
        prenom: donnees.prenom,
        roleId: donnees.roleId,
        departementId: donnees.departementId,
        motDePasseHash: hash,
        estActif: donnees.estActif ?? true,
      },
      include: { role: { select: { code: true } }, departement: true },
    });

    await this.prisma.journalAudit.create({
      data: {
        action: 'UTILISATEUR_CREE',
        utilisateurId: donnees.utilisateurIdCreePar,
        entite: 'Utilisateur',
        entiteId: utilisateur.id,
        metadonnees: {
          email: utilisateur.email,
          role: role.code,
          departementId: utilisateur.departementId,
          creePar: donnees.utilisateurIdCreePar,
        },
      },
    });

    this.logger.log(`Utilisateur cré\u00e9 : ${utilisateur.email} (rôle ${role.code})`);
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      roleId: utilisateur.roleId,
      roleCode: utilisateur.role?.code ?? null,
      departementId: utilisateur.departementId,
      departementCode: utilisateur.departement?.code ?? null,
      estActif: utilisateur.estActif,
      createdAt: utilisateur.createdAt,
      updatedAt: utilisateur.updatedAt,
    };
  }

  /** Liste paginée des utilisateurs avec filtres et portée par département. */
  async listUsers(
    query: {
      page: number;
      pageSize: number;
      search?: string;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
      role?: string;
      departementId?: string;
      estActif?: boolean;
    },
    contexte?: { utilisateurId: string; departementIds: string[] },
  ) {
    const where: Record<string, unknown> = {};
    if (query.role) {
      where.role = { code: query.role };
    }
    if (query.departementId) {
      where.departementId = query.departementId;
    }
    if (query.estActif !== undefined) {
      where.estActif = query.estActif;
    }

    // Appliquer le filtrage par département (rdep/gest ne voient que leur département)
    if (contexte?.departementIds && contexte.departementIds.length > 0) {
      Object.assign(where, appliquerFiltreDepartement(where, contexte.departementIds));
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.utilisateur.findMany({
        where,
        include: { role: { select: { code: true } }, departement: true },
        orderBy: { [query.sortBy ?? 'nom']: query.sortDirection ?? 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.utilisateur.count({ where }),
    ]);

    return {
      data: data.map((u) => ({
        id: u.id,
        email: u.email,
        nom: u.nom,
        prenom: u.prenom,
        roleId: u.roleId,
        roleCode: u.role?.code ?? null,
        departementId: u.departementId,
        departementCode: u.departement?.code ?? null,
        estActif: u.estActif,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      meta: { page: query.page, pageSize: query.pageSize, total },
    };
  }

  /** Récupère un utilisateur par son identifiant, avec vérification de portée. */
  async getUser(
    id: string,
    contexte?: {
      utilisateurIdDemandeur: string;
      roleDemandeur: string;
      departementIds: string[];
    },
  ) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: { role: { select: { code: true } }, departement: true },
    });
    if (!utilisateur) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Utilisateur introuvable');
    }

    // Vérification de la portée par département
    if (contexte) {
      const { utilisateurIdDemandeur, roleDemandeur, departementIds } = contexte;

      // Auto-consultation : toujours autorisé
      if (id === utilisateurIdDemandeur) {
        // retourne l'utilisateur
      } else if (roleDemandeur === 'admin' || roleDemandeur === 'dir') {
        // admin et dir voient tout
      } else if (
        roleDemandeur === 'gest' ||
        roleDemandeur === 'rdep'
      ) {
        // gest et rdep ne voient que les utilisateurs de leur(s) département(s)
        if (
          !utilisateur.departementId ||
          !departementIds.includes(utilisateur.departementId)
        ) {
          throw new ApiError(
            CODES_ERREUR_API.FORBIDDEN,
            403,
            'Accès refusé : utilisateur hors de votre département',
          );
        }
      } else {
        throw new ApiError(
          CODES_ERREUR_API.FORBIDDEN,
          403,
          'Accès refusé',
        );
      }
    }

    return {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      roleId: utilisateur.roleId,
      roleCode: utilisateur.role?.code ?? null,
      departementId: utilisateur.departementId,
      departementCode: utilisateur.departement?.code ?? null,
      estActif: utilisateur.estActif,
      createdAt: utilisateur.createdAt,
      updatedAt: utilisateur.updatedAt,
    };
  }

  /** Met à jour un utilisateur, avec vérification de portée par département. */
  async updateUser(
    id: string,
    donnees: {
      nom?: string;
      prenom?: string;
      roleId?: string;
      departementId?: string | null;
      estActif?: boolean;
      utilisateurIdModifiePar: string;
    },
    contexte?: {
      utilisateurIdDemandeur: string;
      roleDemandeur: string;
      departementIds: string[];
    },
  ) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: { role: { select: { code: true } }, departement: true },
    });
    if (!utilisateur) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Utilisateur introuvable');
    }

    // Vérification de la portée par département
    if (contexte) {
      const { utilisateurIdDemandeur, roleDemandeur, departementIds } = contexte;

      // Auto-modification : toujours autorisé
      if (id !== utilisateurIdDemandeur) {
        if (roleDemandeur === 'admin' || roleDemandeur === 'dir') {
          // admin et dir modifient tout
        } else if (
          roleDemandeur === 'gest' ||
          roleDemandeur === 'rdep'
        ) {
          // gest et rdep ne modifient que les utilisateurs de leur(s) département(s)
          if (
            !utilisateur.departementId ||
            !departementIds.includes(utilisateur.departementId)
          ) {
            throw new ApiError(
              CODES_ERREUR_API.FORBIDDEN,
              403,
              'Accès refusé : utilisateur hors de votre département',
            );
          }
        } else {
          throw new ApiError(
            CODES_ERREUR_API.FORBIDDEN,
            403,
            'Accès refusé',
          );
        }
      }
    }

    if (donnees.roleId !== undefined) {
      const role = await this.prisma.role.findUnique({ where: { id: donnees.roleId } });
      if (!role) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le rôle spécifié est introuvable',
          { champ: 'roleId' },
        );
      }
    }

    if (donnees.departementId !== undefined && donnees.departementId !== null) {
      const departement = await this.prisma.departement.findUnique({
        where: { id: donnees.departementId },
      });
      if (!departement) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le département spécifié est introuvable',
          { champ: 'departementId' },
        );
      }
    }

    const miseAJour = await this.prisma.utilisateur.update({
      where: { id },
      data: {
        ...(donnees.nom !== undefined ? { nom: donnees.nom } : {}),
        ...(donnees.prenom !== undefined ? { prenom: donnees.prenom } : {}),
        ...(donnees.roleId !== undefined ? { roleId: donnees.roleId } : {}),
        ...(donnees.departementId !== undefined ? { departementId: donnees.departementId } : {}),
        ...(donnees.estActif !== undefined ? { estActif: donnees.estActif } : {}),
      },
      include: { role: { select: { code: true } }, departement: true },
    });

    await this.prisma.journalAudit.create({
      data: {
        action: 'UTILISATEUR_MODIFIE',
        utilisateurId: donnees.utilisateurIdModifiePar,
        entite: 'Utilisateur',
        entiteId: id,
        metadonnees: {
          modifications: donnees,
          modifiePar: donnees.utilisateurIdModifiePar,
        },
      },
    });

    this.logger.log(`Utilisateur modifi\u00e9 : ${miseAJour.email}`);
    return {
      id: miseAJour.id,
      email: miseAJour.email,
      nom: miseAJour.nom,
      prenom: miseAJour.prenom,
      roleId: miseAJour.roleId,
      roleCode: miseAJour.role?.code ?? null,
      departementId: miseAJour.departementId,
      departementCode: miseAJour.departement?.code ?? null,
      estActif: miseAJour.estActif,
      createdAt: miseAJour.createdAt,
      updatedAt: miseAJour.updatedAt,
    };
  }

  /** Désactive un utilisateur (soft delete : estActif = false). */
  async disableUser(id: string, utilisateurIdDesactivePar: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: { role: { select: { code: true } } },
    });
    if (!utilisateur) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Utilisateur introuvable');
    }

    // Auto-protection : un utilisateur ne peut pas se d\u00e9sactiver lui-même.
    if (id === utilisateurIdDesactivePar) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Vous ne pouvez pas d\u00e9sactiver votre propre compte',
      );
    }

    // Protection : le dernier admin actif ne peut pas être d\u00e9sactivé.
    if (utilisateur.role?.code === UsersService.ROLE_ADMIN && utilisateur.estActif) {
      const adminActifs = await this.prisma.utilisateur.count({
        where: { role: { code: UsersService.ROLE_ADMIN }, estActif: true },
      });
      if (adminActifs <= 1) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le dernier administrateur actif ne peut pas être d\u00e9sactiv\u00e9',
        );
      }
    }

    const desactive = await this.prisma.utilisateur.update({
      where: { id },
      data: { estActif: false },
      include: { role: { select: { code: true } }, departement: true },
    });

    await this.prisma.journalAudit.create({
      data: {
        action: 'UTILISATEUR_DESACTIVE',
        utilisateurId: utilisateurIdDesactivePar,
        entite: 'Utilisateur',
        entiteId: id,
        metadonnees: {
          email: desactive.email,
          desactivePar: utilisateurIdDesactivePar,
        },
      },
    });

    this.logger.log(`Utilisateur d\u00e9sactiv\u00e9 : ${desactive.email}`);
    return {
      id: desactive.id,
      email: desactive.email,
      nom: desactive.nom,
      prenom: desactive.prenom,
      roleId: desactive.roleId,
      roleCode: desactive.role?.code ?? null,
      departementId: desactive.departementId,
      departementCode: desactive.departement?.code ?? null,
      estActif: desactive.estActif,
      createdAt: desactive.createdAt,
      updatedAt: desactive.updatedAt,
    };
  }

  /** Supprime physiquement un utilisateur (interdit s'il a un audit ou est le dernier admin). */
  async deleteUser(id: string, utilisateurIdSupprimePar: string) {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: { role: { select: { code: true } } },
    });
    if (!utilisateur) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Utilisateur introuvable');
    }

    // Auto-protection : un utilisateur ne peut pas se supprimer lui-même.
    if (id === utilisateurIdSupprimePar) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Vous ne pouvez pas supprimer votre propre compte',
      );
    }

    // Protection : le dernier admin actif ne peut pas être supprimé.
    if (utilisateur.role?.code === UsersService.ROLE_ADMIN && utilisateur.estActif) {
      const adminActifs = await this.prisma.utilisateur.count({
        where: { role: { code: UsersService.ROLE_ADMIN }, estActif: true },
      });
      if (adminActifs <= 1) {
        throw new ApiError(
          CODES_ERREUR_API.BAD_REQUEST,
          400,
          'Le dernier administrateur actif ne peut pas \u00eatre supprim\u00e9',
        );
      }
    }

    // Vérifie l'existence d'audit avant suppression physique.
    const auditExists = await this.prisma.journalAudit.findFirst({
      where: { utilisateurId: id },
    });
    if (auditExists) {
      throw new ApiError(
        CODES_ERREUR_API.BAD_REQUEST,
        400,
        'Impossible de supprimer un utilisateur ayant des entrées d\'audit (utilisez la d\u00e9sactivation)',
      );
    }

    await this.prisma.utilisateur.delete({ where: { id } });

    await this.prisma.journalAudit.create({
      data: {
        action: 'UTILISATEUR_SUPPRIME',
        utilisateurId: utilisateurIdSupprimePar,
        entite: 'Utilisateur',
        entiteId: id,
        metadonnees: {
          email: utilisateur.email,
          supprimePar: utilisateurIdSupprimePar,
        },
      },
    });

    this.logger.log(`Utilisateur supprim\u00e9 : ${utilisateur.email}`);
    return { id };
  }
}
