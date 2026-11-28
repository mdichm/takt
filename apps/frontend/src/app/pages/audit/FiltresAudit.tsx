// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { z } from 'zod';
import { Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/atoms/Input';
import { Bouton } from '@/components/atoms/Bouton';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { AuditFiltres } from '@takt/contracts';

const dictAdmin = traduction('admin') as (typeof DICTIONNAIRE_FR)['admin'];
const dictAudit = dictAdmin.audit;
const dictChamp = dictAudit.champ;
const dictBouton = dictAdmin.bouton;

const schemaFiltres = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  entite: z.string().optional(),
  utilisateur: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

interface FiltresAuditProps {
  readonly filtres: AuditFiltres;
  readonly surFiltres: (filtres: AuditFiltres) => void;
  readonly chargement: boolean;
}

export function FiltresAudit({ filtres, surFiltres, chargement }: FiltresAuditProps): JSX.Element {
  const form = useForm({
    resolver: zodResolver(schemaFiltres),
    defaultValues: {
      search: filtres.search ?? '',
      action: filtres.action ?? '',
      entite: filtres.entite ?? '',
      utilisateur: filtres.utilisateurId ?? '',
      dateFrom: filtres.dateFrom ?? '',
      dateTo: filtres.dateTo ?? '',
    },
    mode: 'onChange',
  });

  const { control, handleSubmit } = form;

  const surValider = (valeurs: z.infer<typeof schemaFiltres>) => {
    surFiltres({
      ...filtres,
      page: 1,
      search: valeurs.search || undefined,
      action: valeurs.action || undefined,
      entite: valeurs.entite || undefined,
      utilisateurId: valeurs.utilisateur || undefined,
      dateFrom: valeurs.dateFrom || undefined,
      dateTo: valeurs.dateTo || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(surValider)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-s)' }}>
        <Controller
          name="search"
          control={control}
          render={({ field }) => (
            <Input
              label={dictChamp.action} // réutilisé comme libellé générique recherche
              type="search"
              value={String(field.value ?? '')}
              placeholder={dictBouton.rechercher}
              disabled={chargement}
              onChange={(valeur: string) => field.onChange(valeur)}
            />
          )}
        />
        <Controller
          name="action"
          control={control}
          render={({ field }) => (
            <Input
              label={dictChamp.action}
              type="text"
              value={String(field.value ?? '')}
              disabled={chargement}
              onChange={(valeur: string) => field.onChange(valeur)}
            />
          )}
        />
        <Controller
          name="entite"
          control={control}
          render={({ field }) => (
            <Input
              label={dictChamp.entite}
              type="text"
              value={String(field.value ?? '')}
              disabled={chargement}
              onChange={(valeur: string) => field.onChange(valeur)}
            />
          )}
        />
        <Controller
          name="utilisateur"
          control={control}
          render={({ field }) => (
            <Input
              label={dictChamp.utilisateur}
              type="text"
              value={String(field.value ?? '')}
              disabled={chargement}
              onChange={(valeur: string) => field.onChange(valeur)}
            />
          )}
        />
        <Controller
          name="dateFrom"
          control={control}
          render={({ field }) => (
            <Input label={dictChamp.dateFrom} type="date" value={String(field.value ?? '')} disabled={chargement} onChange={(valeur: string) => field.onChange(valeur)} />
          )}
        />
        <Controller
          name="dateTo"
          control={control}
          render={({ field }) => (
            <Input label={dictChamp.dateTo} type="date" value={String(field.value ?? '')} disabled={chargement} onChange={(valeur: string) => field.onChange(valeur)} />
          )}
        />
      </div>
      <Bouton variante="primaire" type="submit" libelle={dictBouton.rechercher} disabled={chargement} />
    </form>
  );
}
