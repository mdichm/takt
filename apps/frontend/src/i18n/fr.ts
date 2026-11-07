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
  // Import CSV des référentiels (L04-07)
  importCsv: {
    titre: 'Import CSV des référentiels',
    sousTitre: "Importez un fichier CSV pour enrichir un référentiel.",
    type: 'Type de référentiel',
    types: {
      site: 'Site',
      'type-salle': 'Type de salle',
      equipement: 'Équipement',
      salle: 'Salle',
      groupe: 'Groupe',
      enseignant: 'Enseignant',
    },
    fichier: 'Fichier CSV',
    fichierAide: "Séparateur point-virgule (;) ou virgule (,). Première ligne = en-têtes.",
    apercu: 'Aperçu avant import',
    executer: 'Confirmer l’import',
    modifier: 'Modifier le fichier',
    lignesTotales: 'Lignes totales',
    lignesValides: 'Lignes valides',
    lignesRejetees: 'Lignes rejetées',
    importes: 'Importés',
    rejets: 'Rejets',
    erreurEntetes: 'En-têtes CSV invalides pour ce type de référentiel.',
    erreurEmpreinte: "Le fichier a été modifié depuis l’aperçu. Relancez un aperçu.",
    succes: 'Import terminé avec succès.',
    erreur: 'Une erreur est survenue lors de l’import.',
    ligne: 'Ligne',
    champ: 'Champ',
    valeur: 'Valeur',
    motif: 'Motif',
  },
  // Import depuis une année clôturée (L04-08)
  importArchive: {
    titre: 'Import depuis une année clôturée',
    sousTitre: "Dupliquez sélectivement les données d'une année académique archivée.",
    anneeSource: 'Année source (clôturée)',
    anneeSourceAide: "Sélectionnez une année universitaire dont toutes les versions sont archivées.",
    types: 'Types de données à importer',
    typesListe: {
      parcours: 'Parcours',
      groupe: 'Groupe',
      matiere: 'Matière',
      module: 'Module',
      salle: 'Salle',
    },
    anneeRequis: 'Sélectionnez une année source.',
    typesRequis: 'Sélectionnez au moins un type.',
    apercu: 'Aperçu avant import',
    executer: 'Confirmer l’import',
    modifier: 'Modifier la sélection',
    lignesTotales: 'Lignes totales',
    lignesValides: 'Lignes à importer',
    lignesInvalides: 'Lignes rejetées',
    dejaImports: 'Déjà importés',
    importes: 'Importés',
    rejets: 'Rejets',
    succes: 'Import terminé avec succès.',
    erreur: 'Une erreur est survenue lors de l’import.',
    erreurAnneeNonCloturee: "L'année sélectionnée n'est pas clôturée.",
    erreurEmpreinte: "Les données sources ont évolué depuis l’aperçu. Relancez un aperçu.",
    ligne: 'Ligne',
    code: 'Code',
    statut: 'Statut',
    motif: 'Motif',
    statut_aImporter: 'À importer',
    statut_dejaImporte: 'Déjà importé',
    statut_rejete: 'Rejeté',
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
