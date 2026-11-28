// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { Select } from '@/components/atoms/Select';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { api } from '@/lib/api';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { zEnvelope } from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.ges as unknown as Record<string, string | Record<string, string>>;

function t(cle: string): string {
  const valeur = DICO[cle];
  return typeof valeur === 'string' ? valeur : cle;
}

interface SelecteurVersionProps {
  /** Version actuellement sélectionnée (optionnelle). */
  versionIdSelectionnee?: string | null;
  /** Callback appelée quand une version est sélectionnée. */
  surSelection: (versionId: string) => void;
  /** Désactive le sélecteur. */
  desactive?: boolean;
}

export function SelecteurVersion({
  versionIdSelectionnee,
  surSelection,
  desactive = false,
}: SelecteurVersionProps): JSX.Element {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [versions, setVersions] = useState<{ id: string; libelle: string; etat: string }[]>([]);

  const chargerVersions = useCallback(async (): Promise<void> => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await api.get<unknown>('/versions', {
        schema: zEnvelope(
          z.object({
            id: z.string().uuid(),
            libelle: z.string(),
            etat: z.string(),
            semestreId: z.string().uuid().optional(),
            anneeUniversitaireId: z.string().uuid().optional(),
          }),
        ),
      });
      const data = reponse.data as { items: unknown[] } | null;
      const items = data?.items ?? [];
      setVersions(
        items.map((v: unknown) => {
          const vv = v as { id: string; libelle: string; etat: string };
          return {
            id: vv.id,
            libelle: vv.libelle,
            etat: vv.etat,
          };
        }),
      );
    } catch (err) {
      setErreur(
        err instanceof Error ? err.message : 'Impossible de charger les versions.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    chargerVersions();
  }, [chargerVersions]);

  const gererSelection = useCallback(
    (valeur: string): void => {
      if (valeur) {
        surSelection(valeur);
      }
    },
    [surSelection],
  );

  if (chargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (erreur) {
    return (
      <div
        role="alert"
        aria-live="polite"
        style={{
          padding: 'var(--space-m)',
          color: 'var(--color-text-error)',
          border: 'var(--border-width) solid var(--color-border-erreur)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-erreur)',
        }}
      >
        {erreur}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-m)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-body-small)',
        }}
      >
        {t('vide')}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
      <label
        htmlFor="selecteur-version"
        style={{
          fontSize: 'var(--font-size-body-small)',
          color: 'var(--color-text-primary)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {t('version')}
      </label>
      <Select
        id="selecteur-version"
        label={t('selectionnerVersion')}
        value={versionIdSelectionnee ?? ''}
        onChange={gererSelection}
        options={versions.map((v) => ({ valeur: v.id, libelle: v.libelle + ' (' + v.etat + ')' }))}
        placeholder={t('selectionnerVersion')}
        disabled={desactive}
      />
    </div>
  );
}
