// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bouton } from '@/components/atoms/Bouton';
import { Badge } from '@/components/atoms/Badge';
import { Select } from '@/components/atoms/Select';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { EtatErreur } from '@/components/molecules/EtatErreur';
import { EtatVide } from '@/components/molecules/EtatVide';
import { Paginator } from '@/components/molecules/Paginator';
import { userStore } from '@/stores/userStore';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { EtatVersion } from '@takt/contracts';
import { NotificationBell } from './NotificationBell';
import { VersionStatusWidget } from './VersionStatusWidget';
import { useDashboardVersions } from './useDashboardVersions';
import { actionsRapidesPourRole } from './actionsRapides';
import type { FiltresVersions } from './dashboard.types';

const DICT_TABLEAU_DE_BORD = DICTIONNAIRE_FR.tableauDeBord as Record<string, string>;

function t(cle: keyof typeof DICT_TABLEAU_DE_BORD): string {
  return DICT_TABLEAU_DE_BORD[cle] ?? '';
}

const ETATS_VERSION = ['initial', 'rep_pedag', 'brouillon', 'generation', 'edition', 'valide', 'publie', 'archive'] as const;

const DELAIS_RAFRAICHISSEMENT: { valeur: 30 | 60 | 300; libelle: keyof typeof DICT_TABLEAU_DE_BORD }[] = [
  { valeur: 30, libelle: 'delai30s' },
  { valeur: 60, libelle: 'delai60s' },
  { valeur: 300, libelle: 'delai5min' },
];

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { session, role } = userStore((state) => ({
    session: state.session,
    role: state.session?.role ?? null,
  }));

  const [filtres, setFiltres] = useState<FiltresVersions>({
    etat: undefined,
    departementId: undefined,
    page: 1,
    pageSize: 20,
  });
  const [delaiRafraichissement, setDelaiRafraichissement] = useState<30 | 60 | 300>(30);
  const [erreurManuelle, setErreurManuelle] = useState<Error | null>(null);

  const { versions, total, page, pageSize, estChargement, erreur, revalider } =
    useDashboardVersions(filtres, delaiRafraichissement);

  const gererActualisation = useCallback((): void => {
    setErreurManuelle(null);
    void revalider();
  }, [revalider]);

  const indicateurs = useMemo(() => {
    const comptes: Record<string, number> = {};
    for (const version of versions) {
      comptes[version.etat] = (comptes[version.etat] ?? 0) + 1;
    }
    return ETATS_VERSION.map((etat) => ({ etat, nombre: comptes[etat] ?? 0 }));
  }, [versions]);

  const departementIds = session?.departementIds ?? [];

  const optionsDepartement = useMemo(() => {
    if (departementIds.length === 0) {
      return [{ valeur: '', libelle: t('aucunDepartement') }];
    }
    return [
      { valeur: '', libelle: t('tousDepartements') },
      ...departementIds.map((id) => ({ valeur: id, libelle: `Département ${id}` })),
    ];
  }, [departementIds, t]);

  const gererChangementEtat = useCallback((valeur: string): void => {
    setFiltres((prec) => ({
      ...prec,
      etat: (valeur === '' ? undefined : valeur as EtatVersion),
      page: 1,
    }));
  }, []);

  const gererChangementDepartement = useCallback((departementId: string): void => {
    setFiltres((prec) => ({ ...prec, departementId: departementId === '' ? undefined : departementId, page: 1 }));
  }, []);

  const gererChangementPage = useCallback((nouvellePage: number): void => {
    setFiltres((prec) => ({ ...prec, page: nouvellePage }));
  }, []);

  const gererChangementDelai = useCallback((valeur: string): void => {
    setDelaiRafraichissement(valeur as unknown as 30 | 60 | 300);
  }, []);

  const estFiltreActif = !!filtres.etat || !!filtres.departementId;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const actionsRole = useMemo(() => actionsRapidesPourRole(role ?? ''), [role]);

  const maintenant = new Date();
  const horodatage = maintenant.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (estChargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (erreur || erreurManuelle) {
    return (
      <EtatErreur
        titre={t('erreurChargement')}
        message={(erreur ?? erreurManuelle)?.message ?? t('erreur')}
        onReessayer={gererActualisation}
        libelleReessayer={t('reessayer')}
      />
    );
  }

  return (
    <section
      aria-label="Tableau de bord centralisé"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
        padding: 'var(--space-m)',
        background: 'var(--color-surface-background)',
        minHeight: '100vh',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-m)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{t('titre')}</h1>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 'var(--space-xxs) 0 0 0' }}>
            {t('sousTitre')}
          </p>
        </div>
        <NotificationBell aria-label={t('notifications')} />
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-s)',
          alignItems: 'center',
          padding: 'var(--space-s)',
          border: `var(--border-width) solid var(--color-border)`,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
        }}
      >
        <Select
          label={t('filtreEtat')}
          options={ETATS_VERSION.map((etat) => ({ valeur: etat, libelle: etat }))}
          value={filtres.etat ?? ''}
          placeholder={t('selectionner')}
          onChange={gererChangementEtat}
        />
        <Select
          label={t('filtreDepartement')}
          options={optionsDepartement}
          value={filtres.departementId ?? ''}
          placeholder={t('selectionner')}
          onChange={gererChangementDepartement}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
          <span>{t('rafraichissementAuto')} :</span>
          <Select
            id="select-delai-rafraichissement"
            label=""
            options={DELAIS_RAFRAICHISSEMENT.map((d) => ({ valeur: String(d.valeur), libelle: t(d.libelle) }))}
            value={String(delaiRafraichissement)}
            onChange={gererChangementDelai}
          />
        </div>
        <Bouton libelle={t('actualiser')} onClick={gererActualisation} variante="contour" taille="petite" />
      </div>

      <VersionStatusWidget indicateurs={indicateurs} total={total} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        {versions.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--space-s)' }}>
            {versions.map((version) => (
              <li
                key={version.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-s)',
                  border: `var(--border-width) solid var(--color-border)`,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                }}
              >
                <span style={{ fontSize: 'var(--font-size-body)' }}>{version.id}</span>
                <Badge
                  variante={version.etat === 'publie' || version.etat === 'valide' ? 'succès' : 'info'}
                  libelle={version.etat}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            message={estFiltreActif ? t('aucuneVersionFiltree') : t('aucuneVersion')}
            icone={estFiltreActif ? 'recherche' : 'calendrier'}
          />
        )}
      </div>

      <Paginator page={page} total={totalPages} totalItems={total} onChange={gererChangementPage} />

      <section style={{ marginTop: 'var(--space-l)', padding: 'var(--space-m)', borderTop: `var(--border-width) solid var(--color-border)` }}>
        <h2 style={{ fontSize: 'var(--font-size-h3)', margin: '0 0 var(--space-s) 0' }}>{t('versions')}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-s)' }}>
          {actionsRole.map((action) => (
            <Bouton
              key={action.id}
              libelle={action.libelle}
              onClick={() => navigate(action.chemin)}
              taille="petite"
            />
          ))}
        </div>
      </section>

      <footer
        style={{
          marginTop: 'var(--space-m)',
          paddingTop: 'var(--space-s)',
          borderTop: `var(--border-width) solid var(--color-border)`,
          fontSize: 'var(--font-size-caption)',
          color: 'var(--color-text-secondary)',
          textAlign: 'right',
        }}
      >
        {t('miseAJour')} {horodatage}
      </footer>
    </section>
  );
}
