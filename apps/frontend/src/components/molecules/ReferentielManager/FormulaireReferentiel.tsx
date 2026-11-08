// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodTypeAny } from 'zod';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Checkbox } from '../../atoms/Checkbox';
import { Bouton } from '../../atoms/Bouton';
import { Alerte } from '../../atoms/Alerte';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import { ChampFormulaireReferentiel } from './ReferentielManager.types';
import { PropsBase, VarianteInput } from '../../types';

interface FormulaireReferentielProps extends PropsBase {
  readonly champs: readonly ChampFormulaireReferentiel[];
  readonly schema: ZodTypeAny;
  readonly defaultValues: Record<string, unknown>;
  readonly chargement: boolean;
  readonly libelleBouton: string;
  readonly erreur?: string;
  readonly surSoumettre: (valeurs: Record<string, unknown>) => void;
}

export function FormulaireReferentiel({
  champs,
  schema,
  defaultValues,
  chargement = false,
  libelleBouton,
  erreur,
  surSoumettre,
  id,
  className,
}: FormulaireReferentielProps): JSX.Element {
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const { control, handleSubmit, formState } = form;
  const { errors, isSubmitting } = formState;

  const dictAlerte = traduction('alerte') as (typeof DICTIONNAIRE_FR)['alerte'];

  const surSoumettreForm = (valeurs: Record<string, unknown>): void => {
    surSoumettre(valeurs);
  };

  return (
    <form
      id={id}
      className={className}
      onSubmit={handleSubmit(surSoumettreForm)}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}
    >
      {erreur && <Alerte variante="erreur" titre={dictAlerte.erreur} message={erreur ?? ''} />}
      {champs.map((champ) => {
        const messageErreur = errors[champ.cle]?.message;
        const estInvalide = Boolean(messageErreur);
        switch (champ.type) {
          case 'texte':
          case 'nombre':
          case 'couleur': {
            return (
              <Controller
                key={champ.cle}
                name={champ.cle}
                control={control}
                render={({ field }) => (
                  <Input
                    label={champ.libelle}
                    type={
                      champ.type === 'nombre'
                        ? 'number'
                        : champ.type === 'couleur'
                          ? 'color'
                          : 'text'
                    }
                    value={String(field.value ?? '')}
                    required={champ.obligatoire ?? false}
                    disabled={chargement}
                    {...(messageErreur ? { messageErreur } : {})}
                    onChange={(valeur: string) => field.onChange(valeur)}
                    {...(estInvalide ? { variante: 'erreur' as VarianteInput } : {})}
                  />
                )}
              />
            );
          }
          case 'select': {
            return (
              <Controller
                key={champ.cle}
                name={champ.cle}
                control={control}
                render={({ field }) => (
                  <Select
                    label={champ.libelle}
                    options={champ.options ?? []}
                    value={String(field.value ?? '')}
                    required={champ.obligatoire ?? false}
                    disabled={chargement}
                    {...(messageErreur ? { messageErreur } : {})}
                    onChange={(valeur: string) => field.onChange(valeur)}
                    {...(estInvalide ? { variante: 'erreur' as VarianteInput } : {})}
                  />
                )}
              />
            );
          }
          case 'boolean': {
            return (
              <Controller
                key={champ.cle}
                name={champ.cle}
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label={champ.libelle}
                    checked={Boolean(field.value)}
                    required={champ.obligatoire ?? false}
                    disabled={chargement}
                    onChange={(checked: boolean) => field.onChange(checked)}
                  />
                )}
              />
            );
          }
        }
      })}
      <Bouton
        variante="primaire"
        type="submit"
        libelle={libelleBouton}
        disabled={chargement || isSubmitting}
      />
    </form>
  );
}
