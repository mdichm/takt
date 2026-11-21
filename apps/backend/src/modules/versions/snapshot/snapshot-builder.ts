// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type {
  AffectationPedagogique,
  Contrainte,
  Creneau,
  Departement,
  Enseignant,
  Groupe,
  Matiere,
  Salle,
  Seance,
  Semestre,
  VerrouSeance,
} from '@takt/db';

/**
 * Données brutes nécessaires à la construction d'un snapshot de version.
 * Toutes les collections sont déjà triées par l'appelant (réservoir Prisma `orderBy`).
 * Les champs marqués `?` sont des enrichissements optionnels fournis par le
 * service (codes de référentiel libellés, équipements, effectifs) afin que le
 * fichier dérivé du solveur (TAKT-L07-01) puisse être construit sans accès DB.
 */
export interface DonneesEntreeSnapshot {
  versionId: string;
  semestre: Semestre;
  affectations: (AffectationPedagogique & {
    typeEnseignementCode?: string | null;
  })[];
  seances: Seance[];
  verrous: VerrouSeance[];
  contraintes: Contrainte[];
  groupes: (Groupe & { effectif?: number })[];
  enseignants: (Enseignant & {
    departementIds?: string[];
    chargeMaxHebdo?: number;
  })[];
  salles: (Salle & {
    typeSalleCode?: string | null;
    siteCode?: string | null;
    siteLibelle?: string | null;
    equipements?: string[];
  })[];
  creneaux: Creneau[];
  departements: Departement[];
  matieres: Matiere[];
}

/**
 * Construit le payload déterministe d'un snapshot de version (EX-PRI-06).
 *
 * Règles de déterminisme :
 * - Aucun champ d'horodatage ni d'ID aléatoire dans le payload (le hash
 *   doit être reproductible à l'identique sur une même version).
 * - Tous les tableaux sont triés par identifiant.
 * - Les objets sont sérialisés avec clés triées (délégué à `creerHashSHA256`).
 *
 * @returns Objet JSON sérialisable contenant toutes les familles de données
 *          de la version à l'instant T.
 */
export function construireDonneesSnapshot(entrees: DonneesEntreeSnapshot): unknown {
  const {
    versionId,
    semestre,
    affectations,
    seances,
    verrous,
    contraintes,
    groupes,
    enseignants,
    salles,
    creneaux,
    departements,
    matieres,
  } = entrees;

  return {
    type: 'VERSION',
    versionId,
    semestre: {
      id: semestre.id,
      numero: semestre.numero,
      dateDebut: semestre.dateDebut.toISOString(),
      dateFin: semestre.dateFin.toISOString(),
    },
    activites: affectations.map((a) => ({
      id: a.id,
      enseignantId: a.enseignantId,
      matiereId: a.matiereId,
      groupeId: a.groupeId,
      typeEnseignementId: a.typeEnseignementId ?? null,
      typeEnseignementCode: a.typeEnseignementCode ?? null,
      volumeHebdo: a.volumeHebdo,
      dureeCreneaux: a.dureeCreneaux ?? null,
    })),
    groupes: groupes.map((g) => ({
      id: g.id,
      code: g.code,
      libelle: g.libelle,
      niveauId: g.niveauId,
      effectif: g.effectif ?? 1,
    })),
    enseignants: enseignants.map((e) => ({
      id: e.id,
      matricule: e.matricule,
      nom: e.nom,
      prenom: e.prenom,
      email: e.email,
      departementIds: e.departementIds ?? [],
      chargeMaxHebdo: e.chargeMaxHebdo ?? null,
    })),
    salles: salles.map((s) => ({
      id: s.id,
      code: s.code,
      libelle: s.libelle,
      typeSalleId: s.typeSalleId,
      typeSalleCode: s.typeSalleCode ?? null,
      siteId: s.siteId,
      siteCode: s.siteCode ?? null,
      siteLibelle: s.siteLibelle ?? null,
      capacite: s.capacite,
      equipements: (s.equipements ?? []).slice().sort(),
    })),
    creneaux: creneaux.map((c) => ({
      id: c.id,
      jour: c.jour,
      ordre: c.ordre,
      heureDebut: c.heureDebut.toISOString(),
      heureFin: c.heureFin.toISOString(),
      dureeMinutes: c.dureeMinutes,
    })),
    seances: seances.map((s) => ({
      id: s.id,
      jour: s.jour,
      creneauDebutId: s.creneauDebutId,
      nbCreneaux: s.nbCreneaux,
      salleId: s.salleId ?? null,
      enseignantId: s.enseignantId ?? null,
      groupeId: s.groupeId ?? null,
      matiereId: s.matiereId ?? null,
      typeEnseignementId: s.typeEnseignementId ?? null,
      affectationId: s.affectationId,
      estVerrouillee: s.estVerrouillee,
    })),
    contraintes: contraintes.map((c) => ({
      id: c.id,
      type: c.type,
      cibleId: c.cibleId,
      valeur: c.valeur,
    })),
    verrous: verrous.map((v) => ({
      id: v.id,
      seanceId: v.seanceId,
      utilisateurId: v.utilisateurId,
      type: v.type,
      valeur: v.valeur,
      poids: v.poids,
    })),
    departements: departements.map((d) => ({
      id: d.id,
      code: d.code,
      libelle: d.libelle,
    })),
    matieres: matieres.map((m) => ({
      id: m.id,
      code: m.code,
      libelle: m.libelle,
    })),
    preferences: {
      pasDeTempsMinutes: 30,
      joursOuvres: '1,2,3,4,5,6',
      creneauxParJour: 24,
    },
    profilGeneration: {
      algorithme: 'CP-SAT',
      timeoutSec: 300,
      maxScenarios: 3,
    },
  };
}
