// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only


import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { zConfigSystemeUpdate, type ConfigSystemeUpdate } from '@takt/contracts';
import { Input } from '@/components/atoms/Input';
import { Checkbox } from '@/components/atoms/Checkbox';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';

const dictAdmin = traduction('admin') as (typeof DICTIONNAIRE_FR)['admin'];
const dictParams = dictAdmin.parametres;
const dictChamp = dictParams.champ;
const dictSection = dictParams.section;
const dictBouton = dictAdmin.bouton;
const dictAlerte = traduction('alerte') as (typeof DICTIONNAIRE_FR)['alerte'];

function chargerConfig() {
  return api.get<ConfigSystemeUpdate>('/referentiels/config-systeme').then(
    (reponse) => reponse.data ?? undefined,
  );
}

function modifierConfig(donnees: ConfigSystemeUpdate) {
  return api.patch<ConfigSystemeUpdate>('/referentiels/config-systeme', donnees, {
    schema: zConfigSystemeUpdate,
  }).then((reponse) => reponse.data);
}

export default function ParametresAdminPage(): JSX.Element {
  const { data: config, isLoading: configChargement, error: configErreur } = useQuery({
    queryKey: ['config-systeme'],
    queryFn: chargerConfig,
  });

  const mutationModification = useMutation({
    mutationFn: modifierConfig,
  });

  const form = useForm({
    resolver: zodResolver(zConfigSystemeUpdate),
    defaultValues: {
      pasDeTempsMinutes: config?.pasDeTempsMinutes ?? 30,
      joursOuvres: config?.joursOuvres ?? '1,2,3,4,5,6',
      creneauxParJour: config?.creneauxParJour ?? 24,
      seuilVerrouillageGeneration: config?.seuilVerrouillageGeneration ?? 75,
      avertissementVerrouillageBloquant: config?.avertissementVerrouillageBloquant ?? true,
      bailEditionDureeMinutes: config?.bailEditionDureeMinutes ?? 30,
    },
    mode: 'onChange',
  });
  const { control, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;

  const surValider = (valeurs: ConfigSystemeUpdate) => {
    mutationModification.mutate(valeurs);
  };

  if (configChargement) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{dictAdmin.titre}</h1>
        <h2 style={{ fontSize: 'var(--font-size-h2)', margin: 0, opacity: 0.8 }}>{dictParams.titre}</h2>
        <p>{dictAlerte.erreur}</p>
      </section>
    );
  }

  if (configErreur) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{dictAdmin.titre}</h1>
        <h2 style={{ fontSize: 'var(--font-size-h2)', margin: 0, opacity: 0.8 }}>{dictParams.titre}</h2>
        <Alerte variante="erreur" titre={dictAlerte.erreur} message={String(configErreur)} />
      </section>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{dictAdmin.titre}</h1>
        <h2 style={{ fontSize: 'var(--font-size-h2)', margin: 0, opacity: 0.8 }}>{dictParams.titre}</h2>
      </header>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{dictParams.sousTitre}</p>

      {mutationModification.isError && (
        <Alerte
          variante="erreur"
          titre={dictAlerte.erreur}
          message={mutationModification.error?.message ?? 'Une erreur est survenue.'}
        />
      )}

      <form onSubmit={handleSubmit(surValider)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>

        <section style={{ border: 'var(--border-width) solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 'var(--space-m)' }}>
          <h3 style={{ margin: '0 0 var(--space-s) 0', fontSize: 'var(--font-size-h3)' }}>{dictSection.temps}</h3>
          <Controller
            name="pasDeTempsMinutes"
            control={control}
            render={({ field }) => (
              <Input
                label={dictChamp.pasDeTempsMinutes}
                type="number"
                value={String(field.value ?? '')}
                required
                disabled={mutationModification.isPending}
                {...(errors.pasDeTempsMinutes ? { messageErreur: errors.pasDeTempsMinutes.message } : {})}
                {...(errors.pasDeTempsMinutes ? { variante: 'erreur' } : {})}
                onChange={(valeur: string) => field.onChange(valeur)}
              />
            )}
          />
          <Controller
            name="creneauxParJour"
            control={control}
            render={({ field }) => (
              <Input
                label={dictChamp.creneauxParJour}
                type="number"
                value={String(field.value ?? '')}
                required
                disabled={mutationModification.isPending}
                {...(errors.creneauxParJour ? { messageErreur: errors.creneauxParJour.message } : {})}
                {...(errors.creneauxParJour ? { variante: 'erreur' } : {})}
                onChange={(valeur: string) => field.onChange(valeur)}
              />
            )}
          />
        </section>

        <section style={{ border: 'var(--border-width) solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 'var(--space-m)' }}>
          <h3 style={{ margin: '0 0 var(--space-s) 0', fontSize: 'var(--font-size-h3)' }}>{dictSection.joursOuvres}</h3>
          <Controller
            name="joursOuvres"
            control={control}
            render={({ field }) => (
              <Input
                label={dictChamp.joursOuvres}
                type="text"
                value={String(field.value ?? '')}
                required
                disabled={mutationModification.isPending}
                {...(errors.joursOuvres ? { messageErreur: errors.joursOuvres.message } : {})}
                {...(errors.joursOuvres ? { variante: 'erreur' } : {})}
                onChange={(valeur: string) => field.onChange(valeur)}
              />
            )}
          />
        </section>

        <section style={{ border: 'var(--border-width) solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 'var(--space-m)' }}>
          <h3 style={{ margin: '0 0 var(--space-s) 0', fontSize: 'var(--font-size-h3)' }}>{dictSection.seuils}</h3>
          <Controller
            name="seuilVerrouillageGeneration"
            control={control}
            render={({ field }) => (
              <Input
                label={dictChamp.seuilVerrouillageGeneration}
                type="number"
                value={String(field.value ?? '')}
                required
                disabled={mutationModification.isPending}
                {...(errors.seuilVerrouillageGeneration ? { messageErreur: errors.seuilVerrouillageGeneration.message } : {})}
                {...(errors.seuilVerrouillageGeneration ? { variante: 'erreur' } : {})}
                onChange={(valeur: string) => field.onChange(valeur)}
              />
            )}
          />
          <Controller
            name="avertissementVerrouillageBloquant"
            control={control}
            render={({ field }) => (
              <Checkbox
                label={dictChamp.avertissementVerrouillageBloquant}
                checked={Boolean(field.value)}
                required={false}
                disabled={mutationModification.isPending}
                onChange={(checked: boolean) => field.onChange(checked)}
              />
            )}
          />
        </section>

        <section style={{ border: 'var(--border-width) solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 'var(--space-m)' }}>
          <h3 style={{ margin: '0 0 var(--space-s) 0', fontSize: 'var(--font-size-h3)' }}>{dictSection.bail}</h3>
          <Controller
            name="bailEditionDureeMinutes"
            control={control}
            render={({ field }) => (
              <Input
                label={dictChamp.bailEditionDureeMinutes}
                type="number"
                value={String(field.value ?? '')}
                required
                disabled={mutationModification.isPending}
                {...(errors.bailEditionDureeMinutes ? { messageErreur: errors.bailEditionDureeMinutes.message } : {})}
                {...(errors.bailEditionDureeMinutes ? { variante: 'erreur' } : {})}
                onChange={(valeur: string) => field.onChange(valeur)}
              />
            )}
          />
        </section>

        <Bouton
          variante="primaire"
          type="submit"
          libelle={dictBouton.enregistrer}
          disabled={mutationModification.isPending || isSubmitting}
        />
      </form>
    </section>
  );
}

