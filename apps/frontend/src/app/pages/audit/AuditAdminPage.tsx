// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { zAuditEntree, type AuditEntree, type AuditFiltres } from '@takt/contracts';
import { zReponseListe } from '@/lib/validation';
import { MetaPagination } from '@/components/molecules/DataTable/DataTable.types';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { EtatErreur } from '@/components/molecules/EtatErreur';
import { EtatVide } from '@/components/molecules/EtatVide';
import { Bouton } from '@/components/atoms/Bouton';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import { FiltresAudit } from './FiltresAudit';
import { JournalAuditTable } from './JournalAuditTable';

const dictAdmin = traduction('admin') as (typeof DICTIONNAIRE_FR)['admin'];
const dictAudit = dictAdmin.audit;
const dictBouton = dictAdmin.bouton;

function chargerAudit(filtres: AuditFiltres) {
  const params = new URLSearchParams();
  if (filtres.page !== undefined) params.set('page', String(filtres.page));
  if (filtres.pageSize !== undefined) params.set('pageSize', String(filtres.pageSize));
  if (filtres.search) params.set('search', filtres.search);
  if (filtres.action) params.set('action', filtres.action);
  if (filtres.entite) params.set('entite', filtres.entite);
  if (filtres.entiteId) params.set('entiteId', filtres.entiteId);
  if (filtres.utilisateurId) params.set('utilisateurId', filtres.utilisateurId);
  if (filtres.dateFrom) params.set('dateFrom', filtres.dateFrom);
  if (filtres.dateTo) params.set('dateTo', filtres.dateTo);
  return api.get<{ data: AuditEntree[]; meta: { page: number; pageSize: number; total: number } }>(
    `/audit?${params.toString()}`,
    { schema: zReponseListe(zAuditEntree) },
  );
}

function exporterAuditCsv(filtres: AuditFiltres) {
  const params = new URLSearchParams();
  if (filtres.search) params.set('search', filtres.search);
  if (filtres.action) params.set('action', filtres.action);
  if (filtres.entite) params.set('entite', filtres.entite);
  if (filtres.entiteId) params.set('entiteId', filtres.entiteId);
  if (filtres.utilisateurId) params.set('utilisateurId', filtres.utilisateurId);
  if (filtres.dateFrom) params.set('dateFrom', filtres.dateFrom);
  if (filtres.dateTo) params.set('dateTo', filtres.dateTo);
  fetch(`/audit/export?${params.toString()}`, { credentials: 'include' }).then((reponse) => {
    if (!reponse.ok) {
      throw new Error('Échec de l’export CSV.');
    }
    return reponse.blob();
  }).then((blob) => {
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
  }).catch(() => {
    // Géré par l'état d'erreur de la page si nécessaire.
  });
}

export default function AuditAdminPage(): JSX.Element {
  const [filtres, setFiltres] = useState<AuditFiltres>({ page: 1, pageSize: 20 });
  const [messageSucces, setMessageSucces] = useState<string | undefined>(undefined);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit', filtres],
    queryFn: () => chargerAudit(filtres),
  });

  const entrees: readonly AuditEntree[] = (data?.data ?? []) as readonly AuditEntree[];
  const meta = data?.meta ?? { page: 1, pageSize: 20, total: 0 };

  const etatChargement = isLoading && entrees.length === 0;
  const etatErreur = Boolean(error) && entrees.length === 0;
  const etatVide = !etatChargement && !etatErreur && entrees.length === 0;

  const surFiltres = (nouveaux: AuditFiltres) => {
    setFiltres({ ...nouveaux, page: 1 });
  };

  const surExporter = useCallback(() => {
    void exporterAuditCsv(filtres);
    setMessageSucces('Export CSV lancé.');
    setTimeout(() => setMessageSucces(undefined), 4000);
  }, [filtres]);

  const surReessayer = () => {
    void refetch();
  };
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{dictAdmin.titre}</h1>
        <h2 style={{ fontSize: 'var(--font-size-h2)', margin: 0, opacity: 0.8 }}>{dictAudit.titre}</h2>
      </header>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{dictAudit.sousTitre}</p>

      <FiltresAudit
        filtres={filtres}
        surFiltres={surFiltres}
        chargement={isLoading}
      />

      <div style={{ display: 'flex', gap: 'var(--space-s)', alignItems: 'center' }}>
        <Bouton
          variante="primaire"
          libelle={dictBouton.exporter}
          onClick={surExporter}
          disabled={isLoading}
        />
        {messageSucces && (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>{messageSucces}</span>
        )}
      </div>

      {etatChargement && <EtatChargement />}
      {etatErreur && (
        <EtatErreur
          message={error instanceof Error ? error.message : 'Une erreur est survenue.'}
          onReessayer={surReessayer}
        />
      )}
      {!etatChargement && !etatErreur && (
        <JournalAuditTable
          entrees={entrees}
          meta={meta as unknown as MetaPagination}
          surChangementPage={(page) => setFiltres({ ...filtres, page })}
          surTri={() => {}}
          surReessayer={surReessayer}
        />
      )}
      {etatVide && <EtatVide message={dictAudit.etat.vide} />}
    </section>
  );
}

