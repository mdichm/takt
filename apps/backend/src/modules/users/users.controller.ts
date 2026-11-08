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
  UseGuards,
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
import { JwtAuthGuard, UtilisateurConnecte } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DepartmentScopeGuard } from '../common/guards/department-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DepartmentScope } from '../common/decorators/department-scope.decorator';

/**
 * Requête HTTP enrichie avec l'identité utilisateur (attirée par JwtAuthGuard)
 * et les IDs de département (attirés par DepartmentScopeGuard).
 */
interface RequeteAvecUtilisateur {
  /** En-têtes de la requête. */
  headers: Record<string, string | string[] | undefined>;
  /** Paramètres de query string. */
  query?: Record<string, string | string[] | undefined>;
  /** Identité utilisateur attachée par JwtAuthGuard. */
  user?: UtilisateurConnecte;
  /** IDs de département attachés par DepartmentScopeGuard. */
  departementIds?: string[];
}

/**
 * Contrôleur des utilisateurs : CRUD des comptes et attribution des rôles.
 * Seuls les endpoints listés ici sont exposés (ST_TAKT §3.2).
 * Tous les endpoints sont protégés par JwtAuthGuard + RolesGuard.
 */
@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  /** Liste paginée des utilisateurs (GET /api/v1/users). */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, DepartmentScopeGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @DepartmentScope()
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ query: zUserList })
  @ApiOperation({ summary: 'Liste paginée des utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async list(@Req() req: RequeteAvecUtilisateur): Promise<unknown> {
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

    const departementIds = req.departementIds ?? [];
    const resultat = await this.usersService.listUsers(filtres, {
      utilisateurId: req.user!.sub,
      departementIds,
    });
    return resultat;
  }

  /** Crée un utilisateur (POST /api/v1/users). */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
  @HttpCode(HttpStatus.CREATED)
  @ZodValidation({ body: zUserCreate })
  @ApiOperation({ summary: 'Crée un utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  async create(@Body() corps: UserCreate, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const resultat = await this.usersService.createUser({
      email: corps.email,
      nom: corps.nom,
      prenom: corps.prenom,
      roleId: corps.roleId,
      departementId: corps.departementId ?? null,
      motDePasse: corps.motDePasse,
      estActif: corps.estActif ?? true,
      utilisateurIdCreePar: req.user!.sub,
    });
    return resultat;
  }

  /** Récupère un utilisateur par son ID (GET /api/v1/users/:id). */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest', 'rdep', 'dir')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zUserParams })
  @ApiOperation({ summary: 'Détail d’un utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async getOne(@Param() params: UserParams, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const utilisateur = await this.usersService.getUser(params.id, {
      utilisateurIdDemandeur: req.user!.sub,
      roleDemandeur: req.user!.role,
      departementIds: req.departementIds ?? [],
    });
    return utilisateur;
  }

  /** Met à jour un utilisateur (PATCH /api/v1/users/:id). */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'gest')
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
    @Req() req: RequeteAvecUtilisateur,
  ): Promise<unknown> {
    const misesAJour: {
      nom?: string;
      prenom?: string;
      roleId?: string;
      departementId?: string | null;
      estActif?: boolean;
      utilisateurIdModifiePar: string;
    } = { utilisateurIdModifiePar: req.user!.sub };
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
    const resultat = await this.usersService.updateUser(params.id, misesAJour, {
      utilisateurIdDemandeur: req.user!.sub,
      roleDemandeur: req.user!.role,
      departementIds: req.departementIds ?? [],
    });
    return resultat;
  }

  /** Désactive un utilisateur (DELETE /api/v1/users/:id). */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ZodValidation({ params: zUserParams })
  @ApiOperation({ summary: 'Désactive un utilisateur (soft delete)' })
  @ApiResponse({ status: 200, description: 'Utilisateur désactivé' })
  @ApiResponse({ status: 400, description: 'Requête invalide' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Interdit' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async disable(@Param() params: UserParams, @Req() req: RequeteAvecUtilisateur): Promise<unknown> {
    const resultat = await this.usersService.disableUser(params.id, req.user!.sub);
    return resultat;
  }
}
