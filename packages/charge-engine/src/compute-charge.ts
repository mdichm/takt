// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import type {
  ChargeRuleSet,
  AffectationCharge,
  ChargeEnseignant,
  ResultatCalculCharge,
} from './types';
import { appliquerArrondi } from './arrondi';
import { appliquerCoefficient } from './coefficients';
import { determinerStatut, genererAlertesEnseignant, genererAlertesEquilibrage } from './seuils';
import { agregerParDepartementAvecMap, calculerEcartsEquilibrage } from './equilibrage';

/**
 * Calcule la charge horaire pour un ensemble d'affectations selon un jeu de règles.
 *
 * Fonction pure, déterministe, sans effets de bord (aucune dépendance I/O, base de données,
 * réseau, horloge, aléatoire). Même entrée → même sortie.
 *
 * Algorithme :
 * 1. Pour chaque affectation : appliquer le coefficient du type d'enseignement
 * 2. Agréger par enseignant : somme des volumes pondérés
 * 3. Arrondir la charge selon le mode configuré
 * 4. Déterminer la cible selon le grade de l'enseignant
 * 5. Calculer le taux et vérifier seuils/plafond
 * 6. Agréger par département et calculer l'équilibrage
 * 7. Générer les alertes
 *
 * @param affectations - Liste des affectations pédagogiques (entrées)
 * @param ruleSet - Jeu de règles de charge horaire (configuration)
 * @returns Résultat complet du calcul de charge
 */
export function computeCharge(
  affectations: readonly AffectationCharge[],
  ruleSet: ChargeRuleSet
): ResultatCalculCharge {
  // 1. Construire les maps nécessaires pour l'agrégation
  // Map enseignantId -> liste de ses affectations
  const affectationsParEnseignant = new Map<string, AffectationCharge[]>();
  // Map enseignantId -> departementId (pour l'agrégation département)
  const enseignantDepartement = new Map<string, string>();
  // Map enseignantId -> gradeCode (pour la cible)
  const enseignantGrade = new Map<string, string | undefined>();

  for (const aff of affectations) {
    const arr = affectationsParEnseignant.get(aff.enseignantId) ?? [];
    arr.push(aff);
    affectationsParEnseignant.set(aff.enseignantId, arr);

    enseignantDepartement.set(aff.enseignantId, aff.departementId);
    if (aff.gradeCode) {
      enseignantGrade.set(aff.enseignantId, aff.gradeCode);
    }
  }

  // 2. Calculer la charge par enseignant
  const chargesParEnseignant: ChargeEnseignant[] = [];

  // Tri déterministe des identifiants d'enseignants
  const enseignantIds = Array.from(affectationsParEnseignant.keys()).sort();

  for (const ensId of enseignantIds) {
    const affs = affectationsParEnseignant.get(ensId)!;

    // Somme des volumes pondérés par coefficient
    let chargeBrute = 0;
    for (const aff of affs) {
      chargeBrute += appliquerCoefficient(aff, ruleSet);
    }

    // Arrondi selon le mode configuré
    const chargeArrondie = appliquerArrondi(
      chargeBrute,
      ruleSet.arrondi,
      ruleSet.dureeJournee,
      ruleSet.dureeDemiJournee
    );

    // Cible selon le grade (défaut : plafondHebdomadaire si grade non mappé)
    const gradeCode = enseignantGrade.get(ensId);
    const cible = gradeCode && ruleSet.cibleHebdomadaireParGrade[gradeCode]
      ? ruleSet.cibleHebdomadaireParGrade[gradeCode]
      : ruleSet.plafondHebdomadaire;

    // Taux de charge
    const taux = cible > 0 ? (chargeArrondie / cible) * 100 : 0;

    // Dépassement de plafond
    const depassePlafond = chargeArrondie > ruleSet.plafondHebdomadaire;

    // Statut provisoire (sera affiné avec les alertes)
    const charge: ChargeEnseignant = {
      enseignantId: ensId,
      chargeBrute,
      chargeArrondie,
      cible,
      taux,
      depassePlafond,
      statut: 'CONFORME', // sera mis à jour après
    };

    charge.statut = determinerStatut(charge, ruleSet);
    chargesParEnseignant.push(charge);
  }

  // 3. Agréger par département
  const chargesParDepartement = agregerParDepartementAvecMap(
    chargesParEnseignant,
    enseignantDepartement
  );

  // 4. Calculer les écarts d'équilibrage
  const ecartsEquilibrage = calculerEcartsEquilibrage(
    chargesParDepartement,
    ruleSet.toleranceEquilibrage
  );

  // 5. Générer les alertes
  const alertes: ResultatCalculCharge['alertes'] = [];

  // Alertes par enseignant
  for (const charge of chargesParEnseignant) {
    alertes.push(...genererAlertesEnseignant(charge, ruleSet));
  }

  // Alertes d'équilibrage
  const depEquilibrage = chargesParDepartement.map((d) => ({
    departementId: d.departementId,
    ecart: d.ecart,
  }));
  alertes.push(...genererAlertesEquilibrage(depEquilibrage, ruleSet));

  // 6. Taux de dépassement global (pourcentage d'enseignants en dépassement de plafond)
  const totalEnseignants = chargesParEnseignant.length;
  const nbDepassement = chargesParEnseignant.filter((c) => c.depassePlafond).length;
  const tauxDepassement = totalEnseignants > 0 ? (nbDepassement / totalEnseignants) * 100 : 0;

  return {
    parEnseignant: chargesParEnseignant,
    parDepartement: chargesParDepartement,
    tauxDepassement,
    ecartsEquilibrage,
    alertes,
  };
}