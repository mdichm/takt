// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '@/components/atoms/Input';
import { Checkbox } from '@/components/atoms/Checkbox';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import { zLogin } from '@takt/contracts';

interface FormulaireConnexionProps {
  /** Si une tentative de connexion est en cours. */
  readonly chargement: boolean;
  /** Message d'erreur global à afficher (401, 429). */
  readonly erreur?: string;
  /** Gestionnaire de soumission. */
  readonly surConnexion: (donnees: z.infer<typeof zLogin>) => void;
}

const dict = traduction('connexion') as (typeof DICTIONNAIRE_FR)['connexion'];

/**
 * Formulaire de connexion : email, mot de passe, case « Se souvenir de moi »,
 * bouton « Se connecter ». Validation Zod au submit (FS-FORM-05).
 * Le bouton est désactivé tant que les champs ne sont pas valides (FS-FORM-03).
 */
export function FormulaireConnexion({
  chargement = false,
  erreur,
  surConnexion,
}: FormulaireConnexionProps): JSX.Element {
  const form = useForm<z.infer<typeof zLogin>>({
    defaultValues: { email: '', motDePasse: '' },
    mode: 'onSubmit',
  });

  const { formState, watch, setValue } = form;
  const { isSubmitting } = formState;

  const valeurs = watch();
  // Validité calculée sans déclencher l'affichage des erreurs de champ (mode onSubmit).
  const estValide = zLogin.safeParse(valeurs).success;

  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  const basculerVisibilite = (): void => {
    setMotDePasseVisible((v) => !v);
  };

  const surSoumettre = (e: React.FormEvent): void => {
    e.preventDefault();
    // `valeurs` (watch) contient les saisies utilisateur via setValue.
    const resultat = zLogin.safeParse(valeurs);
    if (!resultat.success) {
      return;
    }
    surConnexion(resultat.data);
  };

  return (
    <form
      id="formulaire-connexion"
      onSubmit={surSoumettre}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
        width: '100%',
        maxWidth: '380px',
      }}
    >
      {erreur && (
        <Alerte variante="erreur" titre="Erreur" message={erreur} />
      )}
      <Input
        id="input-email"
        label={dict.email}
        type="email"
        value={valeurs.email ?? ''}
        required
        disabled={chargement}
        onChange={(valeur) => setValue('email', valeur)}
        placeholder={dict.emailPlaceholder}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
        <Input
          id="input-mot-de-passe"
          label={dict.motDePasse}
          type={motDePasseVisible ? 'text' : 'password'}
          value={valeurs.motDePasse ?? ''}
          required
          disabled={chargement}
          onChange={(valeur) => setValue('motDePasse', valeur)}
          placeholder={dict.motDePassePlaceholder}
        />
        <button
          type="button"
          onClick={basculerVisibilite}
          disabled={chargement}
          style={{
            background: 'none',
            border: 'none',
            cursor: chargement ? 'not-allowed' : 'pointer',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-caption)',
            padding: 0,
          }}
          aria-label={
            motDePasseVisible ? dict.masquerMotDePasse : dict.afficherMotDePasse
          }
        >
          {motDePasseVisible ? dict.masquerMotDePasse : dict.afficherMotDePasse}
        </button>
      </div>
      <Checkbox
        id="checkbox-souvenir"
        label="Se souvenir de moi"
        checked={false}
        disabled={chargement}
        onChange={() => {}}
      />
      <Bouton
        variante="primaire"
        type="submit"
        libelle={dict.boutonConnexion}
        disabled={chargement || isSubmitting || !estValide}
        chargement={chargement}
      />
    </form>
  );
}