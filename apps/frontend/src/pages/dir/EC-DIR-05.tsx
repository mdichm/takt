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

function EC_DIR_05(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionIdDepuisUrl = searchParams.get('versionId') ?? undefined;

  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );
  const [format, setFormat] = useState<'xlsx' | 'pdf' | 'ics'>('xlsx');
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState<string | null>(null);
  const [lienTelechargement, setLienTelechargement] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const {
    data: versionsData,
    isLoading: chargementVersions,
    error: erreurVersions,
  } = useQuery({
    queryKey: ['dir', 'versions-exports'],
    queryFn: () => directionApi.listerVersions({ etat: 'publie' }),
    staleTime: 2 * 60 * 1000,
  });

  const versions = (versionsData?.items ?? []) as VersionItem[];

  const { mutateAsync: preparerExport, isPending: chargementExport } =
    useMutation({
      mutationFn: () =>
        directionApi.preparerExport({
          versionId: versionId!,
          format,
        }),
      onSuccess: (resultat) => {
        setMessageSucces(t('exportSucces'));
        setMessageErreur(null);
        setLienTelechargement(resultat.url);
        setExpiresAt(resultat.expiresAt);
      },
      onError: (err) => {
        setMessageErreur(
          err instanceof Error ? err.message : t('exportEchec'),
        );
        setMessageSucces(null);
      },
    });

  const {
    data: exportsData,
    isLoading: chargementHistorique,
    error: erreurHistorique,
  } = useQuery({
    queryKey: ['dir', 'historique-exports'],
    queryFn: () => directionApi.listerExports(),
    staleTime: 2 * 60 * 1000,
  });

  const exportsHistoriques = (exportsData?.items ?? []) as Array<{
    id: string;
    versionId: string;
    format: string;
    dateGeneration: string;
    url?: string;
    expiresAt?: string;
    statut?: string;
  }>;

  if (chargementVersions || chargementHistorique) {
    return <EtatChargement libelle={t('chargementExports')} />;
  }

  if (erreurVersions || erreurHistorique) {
    return (
      <EtatVide
        titre={t('erreur')}
        message={
          erreurVersions?.message ??
          erreurHistorique?.message ??
          'Impossible de charger les données d’export.'
        }
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
            setLienTelechargement(null);
            setExpiresAt(null);
          }}
        />
      </section>

      <div style={{ padding: 'var(--space-m)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-variant)' }}>
        <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, margin: '0 0 var(--space-s) 0', color: 'var(--color-text-primary)' }}>
          {t('formatExport')}
        </h3>
        <div style={{ display: 'flex', gap: 'var(--space-s)', alignItems: 'center' }}>
          <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 500, marginRight: 'var(--space-xs)' }}>
            {t('labelFormat')}
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'xlsx' | 'pdf' | 'ics')}
            style={{
              fontSize: 'var(--font-size-body)',
              padding: 'var(--space-xs) var(--space-s)',
              border: 'var(--border-width) solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          >
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
            <option value="ics">iCalendar (.ics)</option>
          </select>
        </div>
        <div style={{ marginTop: 'var(--space-m)', display: 'flex', gap: 'var(--space-s)' }}>
          <Bouton
            variante="primaire"
            taille="moyenne"
            disabled={!versionSelectionnee || chargementExport}
            chargement={chargementExport}
            onClick={() => void preparerExport()}
            libelle={t('boutonGenererTelecharger')}
          />
          {lienTelechargement && (
            <a
              href={lienTelechargement}
              download
              style={{
                fontSize: 'var(--font-size-body)',
                padding: 'var(--space-xs) var(--space-m)',
                border: 'var(--border-width) solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              {t('lienTelecharger')}
            </a>
          )}
          {expiresAt && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)', display: 'block' }}>
              {t('expirationExport')} {expiresAt}
            </span>
          )}
        </div>
      </div>

      {/* Bandeau d’écart L10 : endpoints /exports absents en prod (tickets L10-02…L10-05) */}
      <div
        style={{
          marginTop: 'var(--space-l)',
          padding: 'var(--space-m)',
          border: 'var(--border-width) solid var(--color-border-attention)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface-attention)',
          color: 'var(--color-text-attention)',
          fontSize: 'var(--font-size-caption)',
        }}
        role="status"
        aria-live="polite"
      >
        <strong>Écart fonctionnel (L10) :</strong> les endpoints
        <code>POST /api/v1/exports</code> et
        <code>GET /api/v1/exports</code> ne sont pas encore implémentés côté
        backend (tickets TAKT-L10-02 à TAKT-L10-05). La génération d’export et
        l’historique sont simulés côté frontend et ne fonctionneront pas en
        production tant que L10 n’est pas livré.
      </div>

      <section style={{ marginTop: 'var(--space-l)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: '0 0 var(--space-s) 0',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('historiqueExports')}
        </h2>
        {exportsHistoriques.length === 0 && (
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: 0 }}>
            {t('aucunExportHistorique')}
          </p>
        )}
        {exportsHistoriques.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: 'var(--border-width) solid var(--color-divider)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('colonneId')}
                </th>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('colonneVersion')}
                </th>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('colonneFormat')}
                </th>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('colonneDate')}
                </th>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('colonneStatutDir')}
                </th>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('colonneAction')}
                </th>
              </tr>
            </thead>
            <tbody>
              {exportsHistoriques.map((e) => (
                <tr
                  key={e.id}
                  style={{ borderBottom: 'var(--border-width) solid var(--color-divider)' }}
                >
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {e.id.slice(0, 8)}…
                  </td>
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {e.versionId.slice(0, 8)}…
                  </td>
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {e.format}
                  </td>
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {e.dateGeneration}
                  </td>
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {e.statut ?? '—'}
                  </td>
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {e.url ? (
                      <a
                        href={e.url}
                        download
                        style={{
                          color: 'var(--color-primary)',
                          textDecoration: 'underline',
                          fontSize: 'var(--font-size-caption)',
                        }}
                      >
                        {t('lienTelecharger')}
                      </a>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>{t('indisponible')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

export default EC_DIR_05;

