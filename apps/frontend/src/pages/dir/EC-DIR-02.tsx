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

function EC_DIR_02(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionIdDepuisUrl = searchParams.get('versionId') ?? undefined;

  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );
  const [motifRejet, setMotifRejet] = useState('');
  const [typeMotifRejet, setTypeMotifRejet] = useState<'pedagogique' | 'planning' | 'autre'>('pedagogique');
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState<string | null>(null);
  const {
    data: statutsData,
    isLoading: chargementStatuts,
    error: erreurStatuts,
    refetch: refetchStatuts,
  } = useQuery({
    queryKey: ['dir', 'statuts-validation', versionId],
    queryFn: () => directionApi.listerStatutsValidation(versionId ?? ''),
    enabled: !!versionId,
    staleTime: 2 * 60 * 1000,
  });

  const statuts = statutsData ?? [];

  const { mutateAsync: validerDefinitivement, isPending: chargementValidation } =
    useMutation({
      mutationFn: () =>
        directionApi.transitionnerVersion(versionId!, 'validerDefinitivement'),
      onSuccess: async () => {
        setMessageSucces(t('validationSucces'));
        setMessageErreur(null);
        await refetchStatuts();
      },
      onError: (err) => {
        setMessageErreur(
          err instanceof Error ? err.message : t('echecTransition'),
        );
        setMessageSucces(null);
      },
    });

  const { mutateAsync: rejeter, isPending: chargementRejet } = useMutation({
    mutationFn: () =>
      directionApi.transitionnerVersion(versionId!, 'rejeterDirectionPedagogique', motifRejet, typeMotifRejet),
      onSuccess: async () => {
        setMessageSucces(t('rejetSucces'));
        setMessageErreur(null);
        setMotifRejet('');
        await refetchStatuts();
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
          {t('titre')}
        </h1>
        <p>{t('sousTitre')}</p>
        <p>{t('selectionnerVersion')}</p>
      </div>
    );
  }

  const statutsParDepartement = statuts.filter(
    (s) => s.departementId,
  );

  const tousValides = statutsParDepartement.length > 0 &&
    statutsParDepartement.every((s) => s.etat === 'VALIDE');

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
        {t('titre')}
      </h1>
      <p>{t('sousTitre')}</p>

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
          {t('validationDepartements')}
        </h3>
        {statutsParDepartement.length === 0 && (
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {t('aucunDepartement')}
          </p>
        )}
        {statutsParDepartement.map((s) => (
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
              {s.etat === 'VALIDE' ? t('etatValide') : s.etat === 'EN_COURS' ? t('etatEnCours') : s.etat === 'REVALIDATION_REQUISE' ? t('etatRevalidationRequise') : t('etatRejete')}
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
          {t('actionsWorkflow')}
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
          <Bouton
            variante="primaire"
            taille="moyenne"
            disabled={!tousValides || chargementValidation}
            chargement={chargementValidation}
            onClick={() => void validerDefinitivement()}
            libelle={t('boutonValiderDefinitivement')}
          />
          {!tousValides && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xxs)' }}>
              {t('tousDepartementsDoiventEtreValides')}
            </span>
          )}
        </div>

        <div style={{ padding: 'var(--space-m)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            {t('rejeterVersion')}
          </h3>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-s) 0' }}>
            {t('rejeterVersionDetaille')}
          </p>
          <Input
            label={t('champMotifRejet')}
            placeholder={t('champMotifRejet')}
            value={motifRejet}
            onChange={(valeur) => setMotifRejet(valeur)}
          />
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
            libelle={t('boutonRejeter')}
          />
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Bouton
          variante="contour"
          taille="moyenne"
          onClick={() => navigate('/dir/scenario')}
          libelle={t('boutonRetourScenarios')}
        />
      </div>
    </div>
  );
}

export default EC_DIR_02;

