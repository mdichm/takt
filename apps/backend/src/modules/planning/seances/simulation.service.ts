// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRISMA } from '../../common/di/prisma.token';
import { PrismaClient, Prisma } from '@takt/db';
import { CODES_ERREUR_API, ApiError } from '../../common/http/api-error';
import type { SimulationRequete } from '@takt/contracts';

export type TypeConflitLocal =
  | 'ENSEIGNANT' | 'GROUPE' | 'SALLE' | 'CAPACITE' | 'EQUIPEMENT'
  | 'COMPATIBILITE' | 'INDISPONIBILITE' | 'PAUSE' | 'REGLE_PEDAGOGIQUE'
  | 'VERROU' | 'COVOITURAGE' | 'VOEU' | 'DONNEE_MANQUANTE';

export type SeveriteConflitLocal = 'BLOQUANT' | 'AVERTISSEMENT' | 'INFORMATION';

export interface ConflitLocal {
  type: TypeConflitLocal;
  severite: SeveriteConflitLocal;
  message: string;
  details: Record<string, unknown>;
}

export interface SeanceAAAnalyserLocal {
  id: string;
  versionId: string;
  jour: number;
  creneauDebutId: string;
  nbCreneaux: number;
  salleId?: string | null;
  enseignantId?: string | null;
  groupeId?: string | null;
  activite?: string | null;
}

export interface SeanceConcurrenteLocal {
  id: string;
  jour: number;
  creneauDebutId: string;
  salleId?: string | null;
  nbCreneaux: number;
  enseignantId?: string | null;
  groupeId?: string | null;
}

export interface ContexteConflitsLocal {
  seancesConcurrentes: SeanceConcurrenteLocal[];
  salle: { id: string; capacite: number; typeSalleId?: string | null; equipements: string[] } | null;
  groupe: { id: string; effectif?: number | null } | null;
  enseignant: { id: string; indisponibilites?: Date[] | null } | null;
  contraintesIndisponibilite: string[];
  verrous: Array<{ id: string; seanceId?: string | null; type: string; valeur: string; poids: number }>;
  reglesPedagogiques: Array<{ id: string; libelle: string; severite: SeveriteConflitLocal; estRespectee: boolean; details?: Record<string, unknown> | null }>;
  pauses: Array<{ nom: string; creneaux: string[] }>;
  creneauxOrdonnees: string[];
  pasDeTempsMinutes?: number;
  margeCapacite?: number;
  typesSalleCompatibles?: Record<string, string[]> | null;
  voeux?: { creneauxIndesirables: string[] } | null;
  covoiturage?: { actif: boolean; compatible: boolean } | null;
}

interface SeanceLocale {
  id: string;
  versionId: string;
  jour: number;
  creneauDebutId: string;
  nbCreneaux: number;
  salleId?: string | null;
  enseignantId?: string | null;
  groupeId?: string | null;
}

interface CreneauLocale {
  id: string;
  jour: number;
  ordre: number;
  heureDebut: string;
  dureeMinutes: number;
}

interface SalleLocale {
  id: string;
  capacite: number;
}

interface SeanceOccupeeLocale {
  id: string;
  jour: number;
  creneauDebutId: string;
  salleId?: string | null;
  nbCreneaux: number;
}

interface CandidatPlacementLocal {
  jour: number;
  creneauDebutId: string;
  nbCreneaux: number;
  salleId?: string;
  enseignantId?: string;
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);

  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async simuler(
    seanceId: string,
    requete: SimulationRequete,
    utilisateurId: string,
  ): Promise<Array<{
    candidat: CandidatPlacementLocal;
    conflitsResiduels: ConflitLocal[];
    score: number;
    sousScores: { continuite: number; heuresTardives: number; preferences: number };
  }>> {
    const seance = await this.prisma.seance.findUnique({
      where: { id: seanceId },
      select: {
        id: true, versionId: true, jour: true, creneauDebutId: true,
        nbCreneaux: true, salleId: true, enseignantId: true, groupeId: true,
      },
    });
    if (!seance) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Séance introuvable');
    }
    await this.verifierVersionModifiable(seance.versionId);
    const contexte = await this.recupererContexteBulk(seance);
    const engine = await this.chargerMoteur();
    const candidatsBrut = engine.genererCandidats({
      contexte: this.construireContexteMoteur(contexte),
      nbCreneaux: requete.nbCreneaux ?? 1,
      cibleCreneauDebutId: requete.cibleCreneauDebutId ?? undefined,
      cibleSalleId: requete.cibleSalleId ?? undefined,
    });
    const sallesLibres = new Set(
      engine.filtrerSallesLibres(
        candidatsBrut[0]?.creneauDebutId ?? seance.creneauDebutId,
        requete.nbCreneaux ?? 1,
        contexte.salles,
        contexte.seancesOccupees,
        contexte.creneauxOrdonnees,
      ),
    );
    const candidats: CandidatPlacementLocal[] = candidatsBrut.filter((c: any) =>
      sallesLibres.has(c.salleId),
    );
    const alternatives: Array<{
      candidat: CandidatPlacementLocal;
      conflitsResiduels: ConflitLocal[];
      score: number;
      sousScores: { continuite: number; heuresTardives: number; preferences: number };
    }> = [];
    for (const candidat of candidats) {
      const cible: SeanceAAAnalyserLocal = {
        id: seance.id,
        versionId: seance.versionId,
        jour: seance.jour,
        creneauDebutId: candidat.creneauDebutId,
        nbCreneaux: candidat.nbCreneaux,
        salleId: candidat.salleId ?? undefined,
        enseignantId: seance.enseignantId ?? undefined,
        groupeId: seance.groupeId ?? undefined,
      };
      const conflitsResiduels = this.detecterConflitsCandidat(engine, cible, contexte);
      const penalite = engine.pondererConflits(conflitsResiduels);
      const score = engine.calculerScore(penalite);
      const sousScores = this.evaluerSousScores(candidat, conflitsResiduels, contexte);
      alternatives.push({ candidat, conflitsResiduels, score, sousScores });
    }
    const classees = engine.classerAlternatives(
      alternatives as Array<{
        candidat: any;
        conflitsResiduels: ConflitLocal[];
        score: number;
        sousScores: { continuite: number; heuresTardives: number; preferences: number };
      }>,
    );
    return classees.slice(0, requete.nbAlternativesMax ?? 20);
  }

  private async chargerMoteur() {
    return import('@takt/conflict-engine');
  }

  private async recupererContexteBulk(seance: SeanceLocale): Promise<{
    creneaux: CreneauLocale[];
    creneauxOrdonnees: string[];
    salles: SalleLocale[];
    seancesOccupees: SeanceOccupeeLocale[];
  }> {
    return this.prisma.$transaction(
      async (tx) => {
        const seancesConcurrentes = await tx.seance.findMany({
          where: {
            versionId: seance.versionId,
            jour: seance.jour,
            id: { not: seance.id },
          },
          select: {
            id: true, jour: true, creneauDebutId: true, nbCreneaux: true,
            salleId: true, enseignantId: true, groupeId: true,
          },
        });
        const salles = await tx.salle.findMany({
          select: { id: true, capacite: true },
          orderBy: { id: 'asc' },
        });
        const tousCreneaux = await tx.creneau.findMany({
          orderBy: [{ jour: 'asc' }, { ordre: 'asc' }],
          select: { id: true, jour: true, ordre: true },
        });
        await tx.contrainte.findMany({
          where: { versionId: seance.versionId, type: 'INDISPONIBILITE' },
          select: { id: true },
        });
        const creneauxOrdonnees = tousCreneaux.map((c) => c.id);
        return {
          creneaux: tousCreneaux.map((c) => ({
            id: c.id, jour: c.jour, ordre: c.ordre,
            heureDebut: '08:00', dureeMinutes: 60,
          })),
          creneauxOrdonnees,
          salles: salles.map((s) => ({ id: s.id, capacite: s.capacite })),
          seancesOccupees: seancesConcurrentes.map((s) => ({
            id: s.id, jour: s.jour, creneauDebutId: s.creneauDebutId,
            salleId: s.salleId ?? undefined, nbCreneaux: s.nbCreneaux,
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private construireContexteMoteur(contexte: {
    creneaux: CreneauLocale[];
    creneauxOrdonnees: string[];
    salles: SalleLocale[];
    seancesOccupees: SeanceOccupeeLocale[];
  }): any {
    return {
      creneaux: contexte.creneaux,
      creneauxOrdonnees: contexte.creneauxOrdonnees,
      salles: contexte.salles,
      seancesOccupees: contexte.seancesOccupees,
      enseignantId: undefined,
      groupeId: undefined,
      salleIdOriginale: undefined,
    };
  }

  private detecterConflitsCandidat(
    engine: any,
    cible: SeanceAAAnalyserLocal,
    contexte: {
      creneauxOrdonnees: string[];
      seancesOccupees: SeanceOccupeeLocale[];
    },
  ): ConflitLocal[] {
    const contexteConflits: ContexteConflitsLocal = {
      seancesConcurrentes: contexte.seancesOccupees.map((s) => ({
        id: s.id,
        jour: s.jour,
        creneauDebutId: s.creneauDebutId,
        salleId: s.salleId ?? undefined,
        nbCreneaux: s.nbCreneaux,
        enseignantId: undefined,
        groupeId: undefined,
      })),
      salle: null,
      groupe: null,
      enseignant: null,
      contraintesIndisponibilite: [],
      verrous: [],
      reglesPedagogiques: [],
      pauses: [],
      creneauxOrdonnees: contexte.creneauxOrdonnees,
      margeCapacite: 1.1,
    };
    const conflits = engine.detectConflicts(cible, contexteConflits);
    return conflits as ConflitLocal[];
  }

  private evaluerSousScores(
    candidat: CandidatPlacementLocal,
    conflits: ConflitLocal[],
    contexte: {
      creneauxOrdonnees: string[];
      seancesOccupees: SeanceOccupeeLocale[];
    },
  ): { continuite: number; heuresTardives: number; preferences: number } {
    const voisins = contexte.seancesOccupees
      .filter((s) => s.jour === candidat.jour)
      .map((s) => ({
        ordre: this.indexCreneau(s.creneauDebutId, contexte.creneauxOrdonnees),
        enseignantId: undefined,
        groupeId: undefined,
      }))
      .filter((v) => v.ordre !== -1);
    return {
      continuite: voisins.length > 0 ? 100 : 0,
      heuresTardives: 100,
      preferences: Math.max(0, 100
        - conflits.filter((c) => c.type === 'VOEU').length * 50
        - conflits.filter((c) => c.type === 'COVOITURAGE').length * 20),
    };
  }

  private indexCreneau(id: string, ordonnes: string[]): number {
    return ordonnes.indexOf(id);
  }

  private async verifierVersionModifiable(versionId: string): Promise<void> {
    const version = await this.prisma.version.findUnique({
      where: { id: versionId },
      select: { etat: true },
    });
    if (!version) {
      throw new ApiError(CODES_ERREUR_API.NOT_FOUND, 404, 'Version introuvable');
    }
    const etatsBloques = ['publie', 'archive', 'valide', 'valid_dir', 'valid_pedag'];
    if (etatsBloques.includes(version.etat as string)) {
      throw new ApiError(
        CODES_ERREUR_API.CONFLICT,
        409,
        `La version est dans l'état ${version.etat} et n'est plus modifiable`,
      );
    }
  }
}
