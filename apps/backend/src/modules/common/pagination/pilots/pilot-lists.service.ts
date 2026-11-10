// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable } from '@nestjs/common';
import { SeanceListFilters, UserListFilters, VersionListFilters } from '@takt/contracts';
import { Prisma } from '@takt/db';
import { DonneesPaginees } from '../../http/api-envelope';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPrismaQuery } from '../build-prisma-query';
import { construireDonneesPaginees } from '../pagination-normalizer';

type WhereUtilisateur = Prisma.UtilisateurWhereInput;
type OrderUtilisateur = Prisma.UtilisateurOrderByWithRelationInput;
type WhereVersion = Prisma.VersionWhereInput;
type OrderVersion = Prisma.VersionOrderByWithRelationInput;
type WhereSeance = Prisma.SeanceWhereInput;
type OrderSeance = Prisma.SeanceOrderByWithRelationInput;

/** Service des trois listes techniques pilotes du ticket TAKT-L02-03. */
@Injectable()
export class PilotListsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async utilisateurs(query: UserListFilters): Promise<DonneesPaginees<unknown>> {
    const where: WhereUtilisateur = {
      ...(query.role ? { role: { code: query.role } } : {}),
      ...(query.departementId ? { departementId: query.departementId } : {}),
      ...(query.estActif === undefined ? {} : { estActif: query.estActif }),
    };
    const requete = buildPrismaQuery<WhereUtilisateur, OrderUtilisateur>(query, {
      where: () => where,
      searchFields: {
        nom: (valeur) => ({
          OR: [{ nom: { contains: valeur, mode: Prisma.QueryMode.insensitive } }],
        }),
        prenom: (valeur) => ({
          OR: [{ prenom: { contains: valeur, mode: Prisma.QueryMode.insensitive } }],
        }),
        email: (valeur) => ({
          OR: [{ email: { contains: valeur, mode: Prisma.QueryMode.insensitive } }],
        }),
      },
      sortFields: {
        nom: (direction) => ({ nom: direction as Prisma.SortOrder }),
        prenom: (direction) => ({ prenom: direction as Prisma.SortOrder }),
        email: (direction) => ({ email: direction as Prisma.SortOrder }),
        createdAt: (direction) => ({ createdAt: direction as Prisma.SortOrder }),
      },
      defaultSort: () => ({ nom: Prisma.SortOrder.asc }),
      mergeWhere: (base, fragments) => ({
        AND: [base, { OR: fragments.flatMap((fragment) => fragment.OR ?? [fragment]) }],
      }),
    });
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.utilisateur.findMany({
        where: requete.where,
        orderBy: requete.orderBy,
        skip: requete.skip,
        take: requete.take,
      }),
      this.prisma.client.utilisateur.count({ where: requete.where }),
    ]);
    return construireDonneesPaginees(data, total, query);
  }

  async versions(query: VersionListFilters): Promise<DonneesPaginees<unknown>> {
    const where: WhereVersion = query.etat ? { etat: query.etat } : {};
    const requete = buildPrismaQuery<WhereVersion, OrderVersion>(query, {
      where: () => where,
      searchFields: {
        id: (valeur) => ({ id: { contains: valeur, mode: Prisma.QueryMode.insensitive } }),
      },
      sortFields: {
        etat: (direction) => ({ etat: direction as Prisma.SortOrder }),
        createdAt: (direction) => ({ createdAt: direction as Prisma.SortOrder }),
        updatedAt: (direction) => ({ updatedAt: direction as Prisma.SortOrder }),
      },
      defaultSort: () => ({ createdAt: Prisma.SortOrder.desc }),
      mergeWhere: (base, fragments) => ({
        AND: [base, { OR: fragments.flatMap((fragment) => fragment.OR ?? [fragment]) }],
      }),
    });
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.version.findMany({
        where: requete.where,
        orderBy: requete.orderBy,
        skip: requete.skip,
        take: requete.take,
      }),
      this.prisma.client.version.count({ where: requete.where }),
    ]);
    return construireDonneesPaginees(data, total, query);
  }

  async seances(query: SeanceListFilters): Promise<DonneesPaginees<unknown>> {
    const where: WhereSeance = {
      ...(query.versionId ? { versionId: query.versionId } : {}),
      ...(query.jour === undefined ? {} : { jour: query.jour }),
      ...(query.salleId ? { salleId: query.salleId } : {}),
      ...(query.enseignantId ? { enseignantId: query.enseignantId } : {}),
      ...(query.groupeId ? { groupeId: query.groupeId } : {}),
      ...(query.estVerrouillee === undefined ? {} : { estVerrouillee: query.estVerrouillee }),
    };
    const requete = buildPrismaQuery<WhereSeance, OrderSeance>(query, {
      where: () => where,
      searchFields: {
        id: (valeur) => ({ id: { contains: valeur, mode: Prisma.QueryMode.insensitive } }),
        versionId: (valeur) => ({
          versionId: { contains: valeur, mode: Prisma.QueryMode.insensitive },
        }),
      },
      sortFields: {
        jour: (direction) => ({ jour: direction as Prisma.SortOrder }),
        creneauDebut: (direction) => ({ creneauDebut: direction as Prisma.SortOrder }),
        createdAt: (direction) => ({ createdAt: direction as Prisma.SortOrder }),
      },
      defaultSort: () => ({ jour: Prisma.SortOrder.asc }),
      mergeWhere: (base, fragments) => ({
        AND: [base, { OR: fragments.flatMap((fragment) => fragment.OR ?? [fragment]) }],
      }),
    });
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.seance.findMany({
        where: requete.where,
        orderBy: requete.orderBy,
        skip: requete.skip,
        take: requete.take,
      }),
      this.prisma.client.seance.count({ where: requete.where }),
    ]);
    return construireDonneesPaginees(data, total, query);
  }
}
