// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  type Creneau,
  type Seance,
  type Lock,
  type Conflit,
  type SeveriteConflit,
  type TypeConflit,
  type AlternativePlacement,
} from '@takt/contracts';

export type { AlternativePlacement };

/*──────────────────────────────────────────────────────────────────────────────
  Modeles internes de la grille EDT
──────────────────────────────────────────────────────────────────────────────*/

export interface CelluleGrille {
  readonly jour: number;
  readonly creneauDebutId: string;
  readonly creneau: Creneau;
  readonly seances: Seance[];
}

/*──────────────────────────────────────────────────────────────────────────────
  Construction de la grille (jour x creneau)
──────────────────────────────────────────────────────────────────────────────*/

/**
 * Ordonne les seances par cellule de la grille (jour x creneau de debut).
 * Les cellules vides ne sont pas generatees (la grille les rend a vide).
 */
export function construireGrille(
  creneaux: readonly Creneau[],
  seances: readonly Seance[],
): CelluleGrille[] {
  const creneauParId = new Map<string, Creneau>();
  for (const c of creneaux) creneauParId.set(c.id, c);

  const cellules = new Map<string, CelluleGrille>();
  for (const s of seances) {
    const cle = `${s.jour}:${s.creneauDebutId}`;
    let cellule = cellules.get(cle);
    if (!cellule) {
      const creneau = creneauParId.get(s.creneauDebutId);
      if (!creneau) continue;
      cellule = {
        jour: s.jour,
        creneauDebutId: s.creneauDebutId,
        creneau,
        seances: [],
      };
      cellules.set(cle, cellule);
    }
    cellule.seances.push(s);
  }

  return Array.from(cellules.values()).sort((a, b) => {
    if (a.jour !== b.jour) return a.jour - b.jour;
    return a.creneau.ordre - b.creneau.ordre;
  });
}

/** Retourne les seances occupant une cellule donnee. */
export function occupationsCellule(
  cellules: readonly CelluleGrille[],
  jour: number,
  creneauDebutId: string,
): readonly Seance[] {
  const cellule = cellules.find(
    (c) => c.jour === jour && c.creneauDebutId === creneauDebutId,
  );
  return cellule?.seances ?? [];
}

/*──────────────────────────────────────────────────────────────────────────────
  Verrous
──────────────────────────────────────────────────────────────────────────────*/

/** Verifie si une cellule est verrouillee (au moins une seance posee un verrou). */
export function estCelluleVerrouillee(
  cellules: readonly CelluleGrille[],
  jour: number,
  creneauDebutId: string,
): boolean {
  const seances = occupationsCellule(cellules, jour, creneauDebutId);
  return seances.some((s) => s.verrous.length > 0);
}

/**
 * Verifie si une seance posee un verrou actif pose par un autre utilisateur.
 * Retourne le verrou bloquant ou null.
 */
export function verrouBloquantSurSeance(
  seance: Seance,
  utilisateurId: string,
): Lock | null {
  for (const v of seance.verrous) {
    if (v.utilisateurId !== utilisateurId) return v;
  }
  return null;
}

/** Libelle d'affichage d'un type de verrou. */
export function libelleTypeVerrou(type: string): string {
  const libelles: Record<string, string> = {
    CRENEAU: 'Creneau',
    SALLE: 'Salle',
    ENSEIGNANT: 'Enseignant',
    ACTIVITE: 'Activite',
  };
  return libelles[type] ?? type;
}

/*──────────────────────────────────────────────────────────────────────────────
  Bail d'edition
──────────────────────────────────────────────────────────────────────────────*/

export const BAIL_DUREE_DEFAUT_MINUTES = 30;
export const BAIL_ALERTE_AVANT_EXPIRATION_MS = 5 * 60 * 1000; // 5 min

/** Verifie si un bail d'edition est expire. */
export function estBailExpire(
  bail: { dateFin: string },
  maintenant: Date,
): boolean {
  return new Date(bail.dateFin).getTime() <= maintenant.getTime();
}

/** Verifie si un bail est proche de son expiration (alerte renouvellement). */
export function estBailProcheExpiration(
  bail: { dateFin: string },
  maintenant: Date,
  seuilMs = BAIL_ALERTE_AVANT_EXPIRATION_MS,
): boolean {
  return (
    new Date(bail.dateFin).getTime() - maintenant.getTime() <= seuilMs
  );
}

/** Temps restant avant expiration du bail, en secondes (0 si expire). */
export function secondesRestantesBail(
  bail: { dateFin: string },
  maintenant: Date,
): number {
  const reste = new Date(bail.dateFin).getTime() - maintenant.getTime();
  return Math.max(0, Math.floor(reste / 1000));
}

/** Formate le compte a rebours du bail (MM:SS). */
export function formaterCompteARebours(
  bail: { dateFin: string },
  maintenant: Date,
): string {
  const secondes = secondesRestantesBail(bail, maintenant);
  const minutes = Math.floor(secondes / 60);
  const secs = secondes % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
/*──────────────────────────────────────────────────────────────────────────────
  Conflits
──────────────────────────────────────────────────────────────────────────────*/

export const SEVERITE_BLOQUANTE: SeveriteConflit[] = ['BLOQUANT'];

/** Verifie si une liste de conflits contient au moins un conflit bloquant. */
export function estConflitBloquant(conflits: readonly Conflit[]): boolean {
  return conflits.some((c) => c.severite === 'BLOQUANT');
}

/** Retourne uniquement les conflits bloquants. */
export function filtrerConflitsBloquants(conflits: readonly Conflit[]): Conflit[] {
  return conflits.filter((c) => c.severite === 'BLOQUANT');
}

/** Libelle court d'un type de conflit. */
export function libelleTypeConflit(type: TypeConflit): string {
  const libelles: Record<TypeConflit, string> = {
    ENSEIGNANT: 'Enseignant',
    GROUPE: 'Groupe',
    SALLE: 'Salle',
    CAPACITE: 'Capacite',
    EQUIPEMENT: 'Equipement',
    COMPATIBILITE: 'Compatibilite',
    INDISPONIBILITE: 'Indisponibilite',
    PAUSE: 'Pause',
    REGLE_PEDAGOGIQUE: 'Regle pedagogique',
    VERROU: 'Verrou',
    COVOITURAGE: 'Covoiturage',
    VOEU: 'Voeu',
    DONNEE_MANQUANTE: 'Donnee manquante',
  };
  return libelles[type];
}

/*──────────────────────────────────────────────────────────────────────────────
  Couverture pedagogique -> seances a placer
──────────────────────────────────────────────────────────────────────────────*/

/**
 * Derive le nombre de seances encore a placer pour une affectation,
 * a partir du volume declare et du volume deja planifie.
 * Retourne le nombre de creneaux restants (arrondi au creneau au-dessus).
 */
export function seancesRestantesParAffectation(
  volumeDeclareMinutes: number,
  volumePlanifieMinutes: number,
  dureeCreneauMinutes: number,
): number {
  const deficit = Math.max(0, volumeDeclareMinutes - volumePlanifieMinutes);
  if (deficit === 0 || dureeCreneauMinutes <= 0) return 0;
  return Math.ceil(deficit / dureeCreneauMinutes);
}

/*──────────────────────────────────────────────────────────────────────────────
  Alternatives de simulation
──────────────────────────────────────────────────────────────────────────────*/

/** Trie les alternatives par score decroissant, puis par score de continuite. */
export function trierAlternatives(
  alternatives: readonly AlternativePlacement[],
): readonly AlternativePlacement[] {
  return [...alternatives].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.sousScores.continuite - a.sousScores.continuite;
  });
}