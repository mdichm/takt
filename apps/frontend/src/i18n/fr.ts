// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Dictionnaire des chaînes UI en français (typé). Toute chaîne affichée passe par une clé. */

export const DICTIONNAIRE_FR = {
  // Bouton
  bouton: {
    confirmer: 'Confirmer',
    annuler: 'Annuler',
    enregistrer: 'Enregistrer',
    supprimer: 'Supprimer',
    fermer: 'Fermer',
    ouvrir: 'Ouvrir',
    charger: 'Charger en cours…',
    ajouter: 'Ajouter',
    modifier: 'Modifier',
  },
  // Input / FormField
  champ: {
    obligatoire: 'Ce champ est obligatoire.',
    invalide: 'Valeur invalide.',
    erreur: 'Une erreur est survenue.',
    recherche: 'Rechercher…',
  },
  // Alerte
  alerte: {
    information: 'Information',
    succès: 'Succès',
    attention: 'Attention',
    erreur: 'Erreur',
  },
  // Badge / Chip
  badge: {
    actif: 'Actif',
    inactif: 'Inactif',
    verrouillé: 'Verrouillé',
    disponible: 'Disponible',
  },
  // États
  etat: {
    vide: 'Aucune donnée disponible.',
    chargement: 'Chargement en cours…',
    erreur: 'Une erreur est survenue. Veuillez réessayer.',
    succès: 'Opération réussie.',
  },
  // Navigation
  navigation: {
    menu: 'Menu',
    fermerLeMenu: 'Fermer le menu',
    filDariane: 'Fil d\'ariane',
    onglet: 'Onglet',
  },
  // Focus / clavier
  focus: {
    fermerModal: 'Fermer la modal (Échap)',
    avancerOnglet: 'Onglet suivant (flèche droite)',
    reculerOnglet: 'Onglet précédent (flèche gauche)',
  },
  // Référentiels (CRUD générique)
  referentiel: {
    colonneActions: 'Actions',
    vide: 'Aucun élément à afficher.',
    recherche: 'Rechercher un élément…',
    succesCreation: 'Élément créé avec succès.',
    succesModification: 'Élément modifié avec succès.',
    succesSuppression: 'Élément supprimé avec succès.',
    erreurConflit: "Impossible d'enregistrer : un conflit a été détecté (élément déjà utilisé ou lié).",
    confirmationSuppression: 'Voulez-vous vraiment supprimer cet élément ? Cette action est irréversible.',
  },
} as const;

export type CleDictionnaire = keyof typeof DICTIONNAIRE_FR;

export function traduction(cle: CleDictionnaire): (typeof DICTIONNAIRE_FR)[CleDictionnaire] {
  return DICTIONNAIRE_FR[cle];
}
