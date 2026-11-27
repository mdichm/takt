// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, type JSX } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelecteurVersion } from '@/pages/SelecteurVersion';
import { Alerte } from '@/components/atoms/Alerte';
import { EtatVide } from '@/components/molecules/EtatVide';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { directionApi } from '@/lib/direction.api';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { Bouton } from '@/components/atoms/Bouton';
import { Input } from '@/components/atoms/Input';

const DICO = DICTIONNAIRE_FR.dir as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

function EC_DIR_03(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionIdDepuisUrl = searchParams.get('versionId') ?? undefined;

  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );
  const [motifRejet, setMotifRejet] = useState('');
  const [typeMotifRejet, setTypeMotifRejet] = useState<'pedagogique' | 'planning' | 'autre'>('pedagogique');
  const [actionRejet, setActionRejet] = useState<'rejeterDirectionPedagogique' | 'rejeterDirectionPlanning'>('rejeterDirectionPedagogique');
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState<string | null>(null);
  const {
    data: statutsData,
    isLoading: chargementStatuts,
    error: erreurStatuts,
  } = useQuery({
    queryKey: ['dir', 'statuts-validation', versionId],
    queryFn: () => directionApi.listerStatutsValidation(versionId ?? ''),
    enabled: !!versionId,
    staleTime: 2 * 60 * 1000,
  });

  const statuts = statutsData ?? [];

  const { mutateAsync: rejeter, isPending: chargementRejet } = useMutation({
    mutationFn: () =>
      directionApi.transitionnerVersion(
        versionId!,
        actionRejet,
        motifRejet,
        typeMotifRejet,
      ),
    onSuccess: async () => {
      setMessageSucces(t('rejetSucces'));
      setMessageErreur(null);
      setMotifRejet('');
    },
    onError: (err) => {
      setMessageErreur(
        err instanceof Error ? err.message : t('echecTransition'),
      );
      setMessageSucces(null);
    },
  });

  if (chargementStatuts) {
    return <EtatChargement libelle={t('chargementStatuts')} />;
  }

  if (erreurStatuts) {
    return (
      <EtatVide
        titre={t('erreur')}
        message={erreurStatuts.message ?? 'Impossible de charger les statuts.'}
      />
    );
  }

  if (!versionId) {
    return (
      <div style={{ padding: 'var(--space-l)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h1)', marginBottom: 'var(--space-s)' }}>
          {t('titreRejet')}
        </h1>
        <p>{t('sousTitreRejet')}</p>
        <p>{t('selectionnerVersion')}</p>
      </div>
    );
  }

  const estRejetPedagogique = actionRejet === 'rejeterDirectionPedagogique';

  return (
    <div style={{ padding: 'var(--space-l)' }}>
      {messageSucces && (
        <Alerte
          variante="succès"
          titre={t('alerteSucces') ?? 'Succès'}
          message={messageSucces}
          fermable
          onFermer={() => setMessageSucces(null)}
        />
      )}
      {messageErreur && (
        <Alerte
          variante="erreur"
          titre={t('alerteErreur') ?? 'Erreur'}
          message={messageErreur}
          fermable
          onFermer={() => setMessageErreur(null)}
        />
      )}

      <h1 style={{ fontSize: 'var(--font-size-h1)', marginBottom: 'var(--space-s)' }}>
        {t('titreRejet')}
      </h1>
      <p>{t('sousTitreRejet')}</p>

      <section style={{ marginBottom: 'var(--space-l)' }}>
        <SelecteurVersion
          versionIdSelectionnee={versionId ?? undefined}
          surSelection={(id) => {
            setVersionId(id);
            setMessageSucces(null);
            setMessageErreur(null);
          }}
        />
      </section>

      <div style={{ padding: 'var(--space-m)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-variant)' }}>
        <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, margin: '0 0 var(--space-s) 0', color: 'var(--color-text-primary)' }}>
          {t('statutsDepartements')}
        </h3>
        {statuts.length === 0 && (
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {t('aucunDepartement')}
          </p>
        )}
        {statuts.map((s) => (
          <div
            key={s.departementId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-xs) 0',
              borderBottom: 'var(--border-width) solid var(--color-divider)',
            }}
          >
            <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
              {s.departementId}
            </span>
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 600,
                padding: 'var(--space-xxs) var(--space-s)',
                border: 'var(--border-width) solid var(--color-divider)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                color: s.etat === 'VALIDE' ? 'var(--color-text-succès)' : 'var(--color-text-attention)',
              }}
            >
              {s.etat}
            </span>
          </div>
        ))}
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--color-text-primary)',
          }}
        >
          {t('actionsRejet')}
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-s)', alignItems: 'start', marginBottom: 'var(--space-m)' }}>
          <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 500, marginRight: 'var(--space-xs)', whiteSpace: 'nowrap' }}>
            {t('typeActionRejet')}
          </label>
          <select
            value={actionRejet}
            onChange={(e) => setActionRejet(e.target.value as 'rejeterDirectionPedagogique' | 'rejeterDirectionPlanning')}
            style={{
              fontSize: 'var(--font-size-body)',
              padding: 'var(--space-xs) var(--space-s)',
              border: 'var(--border-width) solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="rejeterDirectionPedagogique">{t('actionRejetPedagogique')}</option>
            <option value="rejeterDirectionPlanning">{t('actionRejetPlanning')}</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-s)', alignItems: 'center' }}>
          <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 500, marginRight: 'var(--space-xs)' }}>
            {t('typeMotif')}
          </label>
          <select
            value={typeMotifRejet}
            onChange={(e) => setTypeMotifRejet(e.target.value as 'pedagogique' | 'planning' | 'autre')}
            style={{
              fontSize: 'var(--font-size-body)',
              padding: 'var(--space-xs) var(--space-s)',
              border: 'var(--border-width) solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="pedagogique">{t('typeMotifPedagogique')}</option>
            <option value="planning">{t('typeMotifPlanning')}</option>
            <option value="autre">{t('typeMotifAutre')}</option>
          </select>
        </div>
        <Input
          label={t('champMotifRejet')}
          placeholder={t('champMotifRejet')}
          value={motifRejet}
          onChange={(valeur) => setMotifRejet(valeur)}
        />
        {motifRejet.trim().length === 0 && (
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-error)' }}>
            {t('motifObligatoire')}
          </span>
        )}
        <Bouton
          variante="danger"
          taille="moyenne"
          disabled={!motifRejet.trim() || chargementRejet || !versionId}
          chargement={chargementRejet}
          onClick={() => void rejeter()}
          libelle={estRejetPedagogique ? t('boutonRejeterPedagogique') : t('boutonRejeterPlanning')}
        />
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-l)' }}>
        <Bouton
          variante="contour"
          taille="moyenne"
          onClick={() => navigate('/dir/decision')}
          libelle={t('boutonRetourValidation')}
        />
      </div>
    </div>
  );
}

export default EC_DIR_03;

