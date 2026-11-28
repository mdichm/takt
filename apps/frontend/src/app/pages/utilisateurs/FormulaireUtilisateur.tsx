// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { zReponseListe } from '@/lib/validation';
import {
  zUtilisateurAdminCreate,
  zUtilisateurAdminUpdate,
  zRole,
  zDepartement,
  type Role,
  type Departement,
} from '@takt/contracts';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Checkbox } from '@/components/atoms/Checkbox';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { ComposantFormulaireReferentielProps } from '@/components/molecules/ReferentielManager/ReferentielManager.types';

const dictAdmin = traduction('admin') as (typeof DICTIONNAIRE_FR)['admin'];
const dictUtilisateurs = dictAdmin.utilisateurs;

interface OptionSelect {
  readonly valeur: string;
  readonly libelle: string;
}

function chargerRoles(): Promise<readonly Role[]> {
  return api.get<readonly Role[]>('/referentiels/roles', {
    schema: zReponseListe(zRole),
  }).then((reponse) => reponse.data ?? []);
}

function chargerDepartements(): Promise<readonly Departement[]> {
  return api.get<readonly Departement[]>('/referentiels/departements', {
    schema: zReponseListe(zDepartement),
  }).then((reponse) => reponse.data ?? []);
}

function rolesEnOptions(roles: readonly Role[]): readonly OptionSelect[] {
  return roles.map((r) => ({ valeur: r.id, libelle: r.code }));
}

function departementsEnOptions(departements: readonly Departement[]): readonly OptionSelect[] {
  return departements.map((d) => ({ valeur: d.id, libelle: d.libelle }));
}

export function FormulaireUtilisateur({
  defaultValues,
  chargement = false,
  mode,
  erreur,
  surSoumettre,
}: PropsUtilisateur): JSX.Element {
  const estCreation = mode === 'creation';
  const schema = estCreation ? zUtilisateurAdminCreate : zUtilisateurAdminUpdate;

  const { roles: rolesQuery, departements: depsQuery } = {
    roles: useQuery({
      queryKey: ['roles-options'],
      queryFn: chargerRoles,
    }),
    departements: useQuery({
      queryKey: ['departements-options'],
      queryFn: chargerDepartements,
    }),
  };

  const roles = rolesQuery.data ?? [];
  const departements = depsQuery.data ?? [];

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as Record<string, unknown>,
    mode: 'onChange',
  });

  const { control, handleSubmit, formState, watch } = form;
  const { errors, isSubmitting } = formState;
  const roleSelectionne = watch('roleId');

  const estRdep = roleSelectionne !== undefined && roles.some((r) => r.id === roleSelectionne && r.code === 'rdep');

  const optionsRoles = useMemo(() => rolesEnOptions(roles), [roles]);
  const optionsDepartements = useMemo(() => departementsEnOptions(departements), [departements]);

  const dictChamp = dictUtilisateurs.champ;
  const dictBoutonGlobal = traduction('bouton') as (typeof DICTIONNAIRE_FR)['bouton'];
  const dictAlerte = traduction('alerte') as (typeof DICTIONNAIRE_FR)['alerte'];

  const surValider = (valeurs: Record<string, unknown>): void => {
    surSoumettre(valeurs);
  };

  return (
    <form
      onSubmit={handleSubmit(surValider)}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}
    >
      {erreur && <Alerte variante="erreur" titre={dictAlerte.erreur} message={erreur ?? ''} />}

      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            label={dictChamp.email}
            type="email"
            value={String(field.value ?? '')}
            required
            disabled={chargement}
            {...(errors.email ? { messageErreur: errors.email.message } : {})}
            {...(errors.email ? { variante: 'erreur' } : {})}
            onChange={(valeur: string) => field.onChange(valeur)}
          />
        )}
      />

      <Controller
        name="nom"
        control={control}
        render={({ field }) => (
          <Input
            label={dictChamp.nom}
            type="text"
            value={String(field.value ?? '')}
            required
            disabled={chargement}
            {...(errors.nom ? { messageErreur: errors.nom.message } : {})}
            {...(errors.nom ? { variante: 'erreur' } : {})}
            onChange={(valeur: string) => field.onChange(valeur)}
          />
        )}
      />

      <Controller
        name="prenom"
        control={control}
        render={({ field }) => (
          <Input
            label={dictChamp.prenom}
            type="text"
            value={String(field.value ?? '')}
            required
            disabled={chargement}
            {...(errors.prenom ? { messageErreur: errors.prenom.message } : {})}
            {...(errors.prenom ? { variante: 'erreur' } : {})}
            onChange={(valeur: string) => field.onChange(valeur)}
          />
        )}
      />
      <Controller
        name="roleId"
        control={control}
        render={({ field }) => (
          <Select
            label={dictChamp.role}
            options={optionsRoles}
            value={String(field.value ?? '')}
            required
            disabled={chargement}
            {...(errors.roleId ? { messageErreur: errors.roleId.message } : {})}
            {...(errors.roleId ? { variante: 'erreur' } : {})}
            onChange={(valeur: string) => field.onChange(valeur)}
          />
        )}
      />

      {estRdep && (
        <Controller
          name="departementId"
          control={control}
          render={({ field }) => (
            <Select
              label={dictChamp.departement}
              options={optionsDepartements}
              value={String(field.value ?? '')}
              required
              disabled={chargement}
              {...(errors.departementId ? { messageErreur: errors.departementId.message } : {})}
              {...(errors.departementId ? { variante: 'erreur' } : {})}
              onChange={(valeur: string) => field.onChange(valeur)}
            />
          )}
        />
      )}

      {estCreation && (
        <Controller
          name="motDePasse"
          control={control}
          render={({ field }) => (
            <Input
              label={dictChamp.motDePasse}
              type="password"
              value={String(field.value ?? '')}
              required
              disabled={chargement}
              {...(errors.motDePasse ? { messageErreur: errors.motDePasse.message } : {})}
              {...(errors.motDePasse ? { variante: 'erreur' } : {})}
              onChange={(valeur: string) => field.onChange(valeur)}
            />
          )}
        />
      )}

      {!estCreation && (
        <Controller
          name="estActif"
          control={control}
          render={({ field }) => (
            <Checkbox
              label={dictChamp.estActif}
              checked={Boolean(field.value)}
              required={false}
              disabled={chargement}
              onChange={(checked: boolean) => field.onChange(checked)}
            />
          )}
        />
      )}

      <Bouton
        variante="primaire"
        type="submit"
        libelle={estCreation ? dictBoutonGlobal.ajouter : dictBoutonGlobal.modifier}
        disabled={chargement || isSubmitting}
      />
    </form>
  );
}

type PropsUtilisateur = ComposantFormulaireReferentielProps;
