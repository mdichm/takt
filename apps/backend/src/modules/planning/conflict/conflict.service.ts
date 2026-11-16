// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient } from '@takt/db';

/**
 * Types locaux (miroir de @takt/conflict-engine) pour éviter l'import ESM
 * depuis ce module backend CommonJS. Le moteur est invoqué à l'exécution par
 * import dynamique `await import('@takt/conflict-engine')`.
 */

export type TypeConflitLocal =
  | 'ENSEIGNANT'
  | 'GROUPE'
  | 'SALLE'
  | 'CAPACITE'
  | 'EQUIPEMENT'
  | 'COMPATIBILITE'
  | 'INDISPONIBILITE'
  | 'PAUSE'
  | 'REGLE_PEDAGOGIQUE'
  | 'VERROU'
  | 'COVOITURAGE'
  | 'VOEU'
  | 'DONNEE_MANQUANTE';

export type SeveriteConflitLocal = 'BLOQUANT' | 'AVERTISSEMENT' | 'INFORMATION';

export interface ConflitLocal {
  type: TypeConflitLocal;
  severite: SeveriteConflitLocal;
  message: string;
  details: Record<string, unknown>;
}

interface SeanceAAAnalyserLocal {
  id: string;
  versionId: string;
  jour: Date;
  creneauDebutId: string;
  nbCreneaux?: number;
  salleId?: string | null;
  enseignantId?: string | null;
  groupeId?: string | null;
  activite?: string | null;
}

interface ContexteConflitsLocal {
  seancesConcurrentes: Array<{
    id: string;
    jour: Date;
    creneauDebutId: string;
    nbCreneaux: number;
    salleId?: string | null;
    enseignantId?: string | null;
    groupeId?: string | null;
  }>;
  salle: {
    id: string;
    capacite: number;
    typeSalleId?: string | null;
    equipements: string[];
  } | null;
  groupe: { id: string; effectif?: number | null } | null;
  enseignant: { id: string; indisponibilites?: Date[] | null } | null;
  contraintesIndisponibilite: string[];
  verrous: Array<{
    id: string;
    seanceId?: string | null;
    type: string;
    valeur: string;
    poids: number;
  }>;
  reglesPedagogiques: Array<{
    id: string;
    libelle: string;
    severite: SeveriteConflitLocal;
    estRespectee: boolean;
    details?: Record<string, unknown> | null;
  }>;
  pauses: Array<{ nom: string; creneaux: string[] }>;
  creneauxOrdonnees: string[];
  pasDeTempsMinutes?: number;
  margeCapacite?: number;
  typesSalleCompatibles?: Record<string, string[]> | null;
  voeux?: { creneauxIndesirables: string[] } | null;
  covoiturage?: { actif: boolean; compatible: boolean } | null;
}

interface ConflictDetectParams {
  versionId: string;
  jour: number;
  creneauDebutId: string;
  nbCreneaux: number;
  salleId?: string | null;
  enseignantId?: string | null;
  groupeId?: string | null;
  typeEnseignementId?: string | null;
  seanceIdExclude?: string;
}

export interface ConflitDetectResult {
  conflits: ConflitLocal[];
  bloquant: boolean;
}
/** Convertit un numéro de jour (1=lundi…6=samedi) en Date pour le moteur. */
function jourToDate(jour: number): Date {
  const ref = new Date(Date.UTC(2026, 0, 5)); // lundi 2026-01-05
  ref.setUTCDate(ref.getUTCDate() + (jour - 1));
  return ref;
}

@Injectable()
export class ConflictService {
  private readonly logger = new Logger(ConflictService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Détecte les conflits d'une séance projetée sur une version.
   * Retourne la liste complète des conflits et un indicateur `bloquant`.
   * Un conflit `BLOQUANT` interdit l'écriture de la séance (HTTP 409).
   */
  async detecterConflits(
    params: ConflictDetectParams,
  ): Promise<ConflitDetectResult> {
    const {
      versionId,
      jour,
      creneauDebutId,
      nbCreneaux,
      salleId,
      enseignantId,
      groupeId,
      typeEnseignementId,
      seanceIdExclude,
    } = params;

    const jourNum = Number(jour);
    const jourDate = jourToDate(jourNum);

    // Séances concurrentes (même version, même jour, hors soi-même en mise à jour).
    const concurrentes = await this.prisma.seance.findMany({
      where: {
        versionId,
        jour: jourNum,
        ...(seanceIdExclude ? { id: { not: seanceIdExclude } } : {}),
      },
      select: {
        id: true,
        jour: true,
        creneauDebutId: true,
        nbCreneaux: true,
        salleId: true,
        enseignantId: true,
        groupeId: true,
      },
    });

    const seancesConcurrentes = concurrentes.map((s) => ({
      id: s.id,
      jour: jourToDate(s.jour),
      creneauDebutId: s.creneauDebutId,
      nbCreneaux: s.nbCreneaux,
      salleId: s.salleId ?? undefined,
      enseignantId: s.enseignantId ?? undefined,
      groupeId: s.groupeId ?? undefined,
    }));

    // Salle avec capacités et équipements.
    let salle: ContexteConflitsLocal['salle'] = null;
    if (salleId) {
      const s = await this.prisma.salle.findUnique({
        where: { id: salleId },
        select: {
          id: true,
          capacite: true,
          typeSalleId: true,
          salleEquipements: {
            select: { equipement: { select: { code: true } } },
          },
        },
      });
      if (s) {
        salle = {
          id: s.id,
          capacite: s.capacite,
          typeSalleId: s.typeSalleId ?? undefined,
          equipements: s.salleEquipements.map((e) => e.equipement.code),
        };
      }
    }

    // Groupe : pas de champ effectif sur Groupe → pas de contrôle capacité.
    let groupe: ContexteConflitsLocal['groupe'] = null;
    if (groupeId) {
      const g = await this.prisma.groupe.findUnique({
        where: { id: groupeId },
        select: { id: true },
      });
      if (g) {
        groupe = { id: g.id, effectif: undefined };
      }
    }

    // Enseignant.
    let enseignant: ContexteConflitsLocal['enseignant'] = null;
    if (enseignantId) {
      const e = await this.prisma.enseignant.findUnique({
        where: { id: enseignantId },
        select: { id: true },
      });
      if (e) {
        enseignant = { id: e.id, indisponibilites: undefined };
      }
    }

    // Contraintes d'indisponibilité actives sur la version.
    const contraintes = await this.prisma.contrainte.findMany({
      where: { versionId, type: 'INDISPONIBILITE' },
      select: { id: true },
    });

    // Créneaux ordonnés (triés par jour puis ordre) pour le calcul de chevauchement.
    const tousCreneaux = await this.prisma.creneau.findMany({
      orderBy: [{ jour: 'asc' }, { ordre: 'asc' }],
      select: { id: true },
    });
    const creneauxOrdonnees = tousCreneaux.map((c) => c.id);

    // Pas de récupération de verrous ici : le bail d'édition (VerrouSeance sans
    // champ valeur, L06-07) fait l'objet d'un ticket séparé.
    const verrous: ContexteConflitsLocal['verrous'] = [];

    const seance: SeanceAAAnalyserLocal = {
      id: seanceIdExclude ?? `nouvelle-${creneauDebutId}`,
      versionId,
      jour: jourDate,
      creneauDebutId,
      nbCreneaux,
      salleId: salleId ?? undefined,
      enseignantId: enseignantId ?? undefined,
      groupeId: groupeId ?? undefined,
      activite: typeEnseignementId ?? undefined,
    };

    const contexte: ContexteConflitsLocal = {
      seancesConcurrentes,
      salle,
      groupe,
      enseignant,
      contraintesIndisponibilite: contraintes.map((c) => c.id),
      verrous,
      reglesPedagogiques: [],
      pauses: [],
      creneauxOrdonnees,
      margeCapacite: 1.1,
    };

    // Import dynamique du moteur de conflits (package ESM, backend CommonJS).
    // En cas d'indisponibilité du moteur, on dégrade sans bloquer la séance.
    let conflits: ConflitLocal[] = [];
    try {
      const engine = await import('@takt/conflict-engine');
      conflits = engine.detectConflicts(seance, contexte);
    } catch (err) {
      this.logger.error('Impossible d\'exécuter le moteur de conflits', err as Error);
    }

    return {
      conflits,
      bloquant: conflits.some((c) => c.severite === 'BLOQUANT'),
    };
  }
}