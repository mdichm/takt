// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/atoms/Input';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { zMotDePasseChange } from '@takt/contracts';
import { profilApi } from './profil.api';
import { traduction } from '@/i18n/fr';

const DICT = (traduction('profil') as unknown) as Record<string, string>;

function t(cle: string): string {
  return DICT[cle] ?? cle;
}

interface DonneesForm {
  motDePasseActuel: string;
  nouveauMotDePasse: string;
}

/**
 * Formulaire de changement de mot de passe (POST /users/me/mot-de-passe).
 *
 * Valide l'entrée par le schéma partagé `zMotDePasseChange` (GG-05).
 * Après succès, toutes les sessions de rafraîchissement de l'utilisateur
 * sont révoquées côté serveur : l'utilisateur devra se reconnecter.
 */
export function ChangementMotDePasse(): JSX.Element {
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<boolean>(false);

  const form = useForm<DonneesForm>({
    resolver: zodResolver(zMotDePasseChange),
    defaultValues: { motDePasseActuel: '', nouveauMotDePasse: '' },
    mode: 'onChange',
  });

  const { control, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;

  const dictAlerte = (traduction('alerte') as unknown) as Record<string, string>;

  const surSoumettre = async (valeurs: DonneesForm): Promise<void> => {
    setErreur(null);
    setSucces(false);
    try {
      await profilApi.changeMotDePasse({
        motDePasseActuel: valeurs.motDePasseActuel,
        nouveauMotDePasse: valeurs.nouveauMotDePasse,
      });
      setSucces(true);
      form.reset();
    } catch (e: unknown) {
      const err = e as { message?: string; details?: { champ?: string } };
      setErreur(
        err.details?.champ === 'motDePasseActuel'
          ? t('motDePasse.actuelInvalide')
          : err.message ?? t('erreurGenerique'),
      );
    }
  };

  const messageErreurActuel = errors.motDePasseActuel?.message;
  const messageErreurNouveau = errors.nouveauMotDePasse?.message;

  return (
    <section
      style={
        {
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-s)',
          padding: 'var(--space-m)',
          border: `var(--border-width) solid var(--color-border)`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
        }
      }
    >
      <h3 style={{ fontSize: 'var(--font-size-h3)', margin: 0, color: 'var(--color-text-primary)' }}>
        {t('motDePasse.titre')}
      </h3>
      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 0 }}>
        {t('motDePasse.description')}
      </p>

      {succes && (
        <Alerte variante="succès" titre={dictAlerte.succès} message={t('motDePasse.modifie')} />
      )}
      {erreur && <Alerte variante="erreur" titre={dictAlerte.erreur} message={erreur} />}

      <form
        onSubmit={handleSubmit(surSoumettre)}
        style={
          {
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-s)',
            marginTop: 'var(--space-xs)',
          }
        }
      >
        <Controller
          name="motDePasseActuel"
          control={control}
          render={({ field }) => (
            <Input
              id="input-mot-de-passe-actuel"
              label={t('motDePasse.actuel')}
              type="password"
              value={field.value}
              onChange={field.onChange}
              required
              variante={messageErreurActuel ? 'erreur' : 'défaut'}
              messageErreur={messageErreurActuel}
              placeholder={t('motDePasse.placeholderActuel')}
            />
          )}
        />
        <Controller
          name="nouveauMotDePasse"
          control={control}
          render={({ field }) => (
            <Input
              id="input-nouveau-mot-de-passe"
              label={t('motDePasse.nouveau')}
              type="password"
              value={field.value}
              onChange={field.onChange}
              required
              variante={messageErreurNouveau ? 'erreur' : 'défaut'}
              messageErreur={messageErreurNouveau}
              placeholder={t('motDePasse.placeholderNouveau')}
            />
          )}
        />
        <Bouton
          libelle={t('motDePasse.bouton')}
          type="submit"
          variante="primaire"
          chargement={isSubmitting}
          disabled={isSubmitting}
        />
      </form>
      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 0 }}>
        {t('motDePasse.consequence')}
      </p>
    </section>
  );
}
