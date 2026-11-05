// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  zUserCreate,
  zUserList,
  zUserParams,
  zUserUpdate,
  type UserCreate,
  type UserListFilters,
  type UserParams,
  type UserUpdate,
} from '@takt/contracts';
import { ZodValidation } from '../common/pipes/zod-validation.decorator';
import { UsersService } from './users.service';

/** Requête HTTP minimale, vue par le contrôleur (pas d'import express). */
interface RequeteHttpMinimale {
  /** En-têtes de la requête. */
  headers: Record<string, string | string[] | undefined>;
  /** Paramètres de query string. */
  query?: Record<string, string | string[] | undefined>;
  /** Utilisateur authentifié (porté par le guard JWT). */
  user?: { sub?: string };
}

/**
 * Contrôleur des utilisateurs : CRUD des comptes et attribution des rôles.
 * Seuls les endpoints listés ici sont exposés (ST_TAKT §3.2).
 */
@ApiTags('utilisateurs')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  /** Extrait l'identifiant de l'utilisateur connecté depuis la requête. */
  private utilisateurId(req: RequeteHttpMinimale): string {
    return req.user?.sub ?? '';
  }

  /** Liste paginée des utilisateurs (GET /api/v1/users). */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zUserList })
  @ApiOperation({ summary: 'Liste paginée des utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteHttpMinimale): Promise<unknown> {
    const query = (req.query ?? {}) as unknown as UserListFilters;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filtres: {
      page: number;
      pageSize: number;
      search?: string;
      sortBy?: string;
      sortDirection?: 'asc' | 'desc';
      role?: string;
      departementId?: string;
      estActif?: boolean;
    } = { page, pageSize };
    if (query.search !== undefined) {
      filtres.search = query.search;
    }
    if (query.sortBy !== undefined) {
      filtres.sortBy = query.sortBy;
    }
    if (query.sortDirection !== undefined) {
      filtres.sortDirection = query.sortDirection;
    }
    if (query.role !== undefined) {
      filtres.role = query.role;
    }
    if (query.departementId !== undefined) {
      filtres.departementId = query.departementId;
    }
    if (query.estActif !== undefined) {
      filtres.estActif = query.estActif;
    }
    const resultat = await this.usersService.listUsers(filtres);
    return {
      data: resultat.data,
      error: null,
      meta: {
        requestId: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
        page: resultat.meta.page,
        pageSize: resultat.meta.pageSize,
        total: resultat.meta.total,
      },
    };
  }

  /** Crée un utilisateur (POST /api/v1/users). */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zUserCreate })
  @ApiOperation({ summary: 'Crée un utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(
    @Body() corps: UserCreate,
    @Req() req: RequeteHttpMinimale,
  ): Promise<unknown> {
    const resultat = await this.usersService.createUser({
      email: corps.email,
      nom: corps.nom,
      prenom: corps.prenom,
      roleId: corps.roleId,
      departementId: corps.departementId ?? null,
      motDePasse: corps.motDePasse,
      estActif: corps.estActif ?? true,
      utilisateurIdCreePar: this.utilisateurId(req),
    });
    return {
      data: resultat,
      error: null,
      meta: {
        requestId: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** Récupère un utilisateur par son ID (GET /api/v1/users/:id). */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zUserParams })
  @ApiOperation({ summary: 'Détail d’un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async getOne(@Param() params: UserParams): Promise<unknown> {
    const utilisateur = await this.usersService.getUser(params.id);
    return {
      data: utilisateur,
      error: null,
      meta: {
        requestId: '',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** Met à jour un utilisateur (PATCH /api/v1/users/:id). */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zUserParams, body: zUserUpdate })
  @ApiOperation({ summary: 'Modifie un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur modifié' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async update(
    @Param() params: UserParams,
    @Body() corps: UserUpdate,
    @Req() req: RequeteHttpMinimale,
  ): Promise<unknown> {
    const misesAJour: {
      nom?: string;
      prenom?: string;
      roleId?: string;
      departementId?: string | null;
      estActif?: boolean;
      utilisateurIdModifiePar: string;
    } = { utilisateurIdModifiePar: this.utilisateurId(req) };
    if (corps.nom !== undefined) {
      misesAJour.nom = corps.nom;
    }
    if (corps.prenom !== undefined) {
      misesAJour.prenom = corps.prenom;
    }
    if (corps.roleId !== undefined) {
      misesAJour.roleId = corps.roleId;
    }
    if (corps.departementId !== undefined) {
      misesAJour.departementId = corps.departementId;
    }
    if (corps.estActif !== undefined) {
      misesAJour.estActif = corps.estActif;
    }
    const resultat = await this.usersService.updateUser(params.id, misesAJour);
    return {
      data: resultat,
      error: null,
      meta: {
        requestId: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /** Désactive un utilisateur (DELETE /api/v1/users/:id). */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zUserParams })
  @ApiOperation({ summary: 'Désactive un utilisateur (soft delete)' })
  @ApiResponse({ status: 200, description: 'Utilisateur désactivé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async disable(
    @Param() params: UserParams,
    @Req() req: RequeteHttpMinimale,
  ): Promise<unknown> {
    const resultat = await this.usersService.disableUser(params.id, this.utilisateurId(req));
    return {
      data: resultat,
      error: null,
      meta: {
        requestId: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
