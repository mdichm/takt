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
import type { VersionItem } from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.dir as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

function EC_DIR_04(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionIdDepuisUrl = searchParams.get('versionId') ?? undefined;

  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState<string | null>(null);

  const {
    data: versionsData,
    isLoading: chargementVersions,
    error: erreurVersions,
    refetch: refetchVersions,
  } = useQuery({
    queryKey: ['dir', 'versions-archivage'],
    queryFn: () => directionApi.listerVersions(),
    staleTime: 2 * 60 * 1000,
  });

  const versions = (versionsData?.items ?? []) as VersionItem[];
  const versionsArchivables = versions.filter(
    (v) => v.etat === 'valide' || v.etat === 'publie',
  );

  const { mutateAsync: archiver, isPending: chargementArchivage } = useMutation({
    mutationFn: () =>
      directionApi.transitionnerVersion(versionId!, 'archiverSansPublier'),
    onSuccess: async () => {
      setMessageSucces(t('archivageSucces'));
      setMessageErreur(null);
      await refetchVersions();
    },
    onError: (err) => {
      setMessageErreur(
        err instanceof Error ? err.message : t('echecTransition'),
      );
      setMessageSucces(null);
    },
  });

  const { mutateAsync: dupliquer, isPending: chargementDuplication } =
    useMutation({
      mutationFn: () => directionApi.dupliquerVersionArchivee(versionId!),
      onSuccess: async () => {
        setMessageSucces(t('duplicationSucces'));
        setMessageErreur(null);
        await refetchVersions();
      },
      onError: (err) => {
        setMessageErreur(
          err instanceof Error ? err.message : t('echecTransition'),
        );
        setMessageSucces(null);
      },
    });

  if (chargementVersions) {
    return <EtatChargement libelle={t('chargementVersions')} />;
  }

  if (erreurVersions) {
    return (
      <EtatVide
        titre={t('erreur')}
        message={erreurVersions.message ?? 'Impossible de charger les versions.'}
      />
    );
  }

  const versionSelectionnee = versions.find((v) => v.id === versionId);
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
          {t('versionsArchivables')}
        </h3>
        {versionsArchivables.length === 0 && (
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {t('aucuneVersionArchivable')}
          </p>
        )}
        {versionsArchivables.map((v) => (
          <div
            key={v.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-xs) 0',
              borderBottom: 'var(--border-width) solid var(--color-divider)',
            }}
          >
            <div>
              <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)', display: 'block' }}>
                {v.id.slice(0, 8)}…
              </span>
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
                État : {v.etat} · {v.datePublication ?? '—'}
              </span>
            </div>
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                fontWeight: 600,
                padding: 'var(--space-xxs) var(--space-s)',
                border: 'var(--border-width) solid var(--color-divider)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                color: v.etat === 'publie' ? 'var(--color-text-succès)' : 'var(--color-text-attention)',
              }}
            >
              {v.etat}
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
          {t('actionsArchivage')}
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
          <Bouton
            variante="danger"
            taille="moyenne"
            disabled={!versionSelectionnee || chargementArchivage}
            chargement={chargementArchivage}
            onClick={() => void archiver()}
            libelle={t('boutonArchiver')}
          />
          <Bouton
            variante="secondaire"
            taille="moyenne"
            disabled={
              !versionSelectionnee ||
              versionSelectionnee.etat !== 'archive' ||
              chargementDuplication
            }
            chargement={chargementDuplication}
            onClick={() => void dupliquer()}
            libelle={t('boutonNouvelleVersionDepuisArchive')}
          />
          {!versionSelectionnee && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xxs)' }}>
              {t('selectionnerVersionPourArchiver')}
            </span>
          )}
          {versionSelectionnee &&
            versionSelectionnee.etat !== 'archive' &&
            (
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xxs)' }}>
                {t('seuleVersionArchiveeDuplicable')}
              </span>
            )}
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-l)' }}>
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

export default EC_DIR_04;

