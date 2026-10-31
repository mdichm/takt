// i18n français uniquement — toute chaîne UI passe par ces clés (GG-03)
export const fr = {
  common: {
    loading: 'Chargement...',
    error: 'Une erreur est survenue',
    success: 'Opération réussie',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    search: 'Rechercher',
  },
  auth: {
    login: 'Connexion',
    email: 'Email',
    password: 'Mot de passe',
    invalidCredentials: 'Identifiants incorrects',
    tooManyAttempts: 'Trop de tentatives, réessayez plus tard',
  },
} as const;

export type FrTranslations = typeof fr;