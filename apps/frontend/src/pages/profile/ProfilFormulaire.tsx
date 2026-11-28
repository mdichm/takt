// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { zProfilUpdate } from '@takt/contracts';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { profilApi } from './profil.api';
import type { OptionDepartement } from './profil.types';
import { traduction } from '@/i18n/fr';

const DICT = (traduction('profil') as unknown) as Record<string, string>;

function t(cle: string): string {
  return DICT[cle] ?? cle;
}

interface DonneesForm {
  nom: string;
  prenom: string;
  email: string;
  departementId: string;
}

/**
 * Formulaire principal du profil (PATCH /users/me).
 *
 * Le rôle est affiché en lecture seule : il ne peut pas être modifié par
 * cet endpoint (pas d'auto-élévation de privilèges).
 *
 * Valide l'entrée par le schéma partagé `zProfilUpdate` (GG-05).
 */
interface ProfilFormulaireProps {
  profil: {
    id: string;
    email: string;
    nom: string;
    prenom: string;
    role: string;
    departementId: string | null;
    departementCode: string | null;
  } | null;
  optionsDepartement: readonly OptionDepartement[];
}

export function ProfilFormulaire({
  profil,
  optionsDepartement,
}: ProfilFormulaireProps): JSX.Element {
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<boolean>(false);

  const form = useForm<DonneesForm>({
    resolver: zodResolver(zProfilUpdate),
    defaultValues: {
      nom: profil?.nom ?? '',
      prenom: profil?.prenom ?? '',
      email: profil?.email ?? '',
      departementId: profil?.departementId ?? '',
    },
    mode: 'onChange',
  });

  const { control, handleSubmit, formState, reset } = form;
  const { errors, isSubmitting } = formState;

  const dictAlerte = (traduction('alerte') as unknown) as Record<string, string>;

  const surSoumettre = async (valeurs: DonneesForm): Promise<void> => {
    setErreur(null);
    setSucces(false);
    try {
      await profilApi.updateProfil({
        nom: valeurs.nom,
        prenom: valeurs.prenom,
        email: valeurs.email,
        departementId: valeurs.departementId || null,
      });
      setSucces(true);
      reset({
        nom: valeurs.nom,
        prenom: valeurs.prenom,
        email: valeurs.email,
        departementId: valeurs.departementId,
      });
    } catch (e: unknown) {
      const err = e as { message?: string; details?: { champ?: string } };
      setErreur(
        err.details?.champ === 'email'
          ? t('emailDejaUtilise')
          : err.message ?? t('erreurGenerique'),
      );
    }
  };

  const messageErreurNom = errors.nom?.message;
  const messageErreurPrenom = errors.prenom?.message;
  const messageErreurEmail = errors.email?.message;
  const messageErreurDepartement = errors.departementId?.message;

  const departementSelectionne =
    optionsDepartement.find((o) => o.valeur === (profil?.departementId ?? ''))?.libelle ?? t('aucunDepartement');

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
        {t('informations.titre')}
      </h3>

      {succes && (
        <Alerte variante="succès" titre={dictAlerte.succès} message={t('profilModifie')} />
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
          name="nom"
          control={control}
          render={({ field }) => (
            <Input
              id="input-nom"
              label={t('champ.nom')}
              value={field.value}
              onChange={field.onChange}
              required
              variante={messageErreurNom ? 'erreur' : 'défaut'}
              messageErreur={messageErreurNom}
              placeholder={t('champ.placeholderNom')}
            />
          )}
        />
        <Controller
          name="prenom"
          control={control}
          render={({ field }) => (
            <Input
              id="input-prenom"
              label={t('champ.prenom')}
              value={field.value}
              onChange={field.onChange}
              required
              variante={messageErreurPrenom ? 'erreur' : 'défaut'}
              messageErreur={messageErreurPrenom}
              placeholder={t('champ.placeholderPrenom')}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              id="input-email"
              label={t('champ.email')}
              type="email"
              value={field.value}
              onChange={field.onChange}
              required
              variante={messageErreurEmail ? 'erreur' : 'défaut'}
              messageErreur={messageErreurEmail}
              placeholder={t('champ.placeholderEmail')}
            />
          )}
        />
        <Controller
          name="departementId"
          control={control}
          render={({ field }) => (
            <Select
              id="select-departement"
              label={t('champ.departement')}
              options={optionsDepartement}
              value={field.value}
              onChange={field.onChange}
              placeholder={t('champ.selectionnerDepartement')}
              variante={messageErreurDepartement ? 'erreur' : 'défaut'}
              messageErreur={messageErreurDepartement}
            />
          )}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xxs)' }}>
          <label
            htmlFor="input-role"
            style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-secondary)' }}
          >
            {t('champ.role')}
          </label>
          <input
            id="input-role"
            readOnly
            value={profil?.role ?? ''}
            style={
              {
                height: 'var(--input-height)',
                padding: '0 var(--space-s)',
                border: `var(--border-width) solid var(--color-border)`,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-disabled)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-body)',
                outline: 'none',
              }
            }
          />
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {t('champ.roleLectureSeule')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-s)' }}>
          <Bouton
            libelle={t('bouton.enregistrer')}
            type="submit"
            variante="primaire"
            chargement={isSubmitting}
            disabled={isSubmitting}
          />
          <Bouton
            libelle={t('bouton.annuler')}
            type="button"
            variante="contour"
            taille="petite"
            onClick={() => {
              reset({
                nom: profil?.nom ?? '',
                prenom: profil?.prenom ?? '',
                email: profil?.email ?? '',
                departementId: profil?.departementId ?? '',
              });
              setErreur(null);
              setSucces(false);
            }}
          />
        </div>
      </form>
      <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 0 }}>
        {t('informations.departementAffiche') + ' ' + departementSelectionne}
      </p>
    </section>
  );
}
