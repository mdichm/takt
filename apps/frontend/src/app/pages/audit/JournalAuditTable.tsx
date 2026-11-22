// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { DataTable } from '@/components/molecules/DataTable/DataTable';
import { ColonneDataTable } from '@/components/molecules/DataTable/DataTable.types';
import { Paginator } from '@/components/molecules/Paginator';

import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { AuditEntree } from '@takt/contracts';
import { MetaPagination } from '@/components/molecules/DataTable/DataTable.types';

const dictAdmin = traduction('admin') as (typeof DICTIONNAIRE_FR)['admin'];
const dictAudit = dictAdmin.audit;

interface JournalAuditTableProps {
  readonly entrees: readonly AuditEntree[];
  readonly meta: MetaPagination;
  readonly surChangementPage: (page: number) => void;
  readonly surTri: (cle: string, direction: 'asc' | 'desc' | null) => void;
  readonly surReessayer: () => void;
}

const COLONNES: readonly ColonneDataTable<AuditEntree>[] = [
  { cle: 'horodatage', libelle: dictAudit.colonne.horodatage, triable: true },
  { cle: 'action', libelle: dictAudit.colonne.action, triable: true },
  { cle: 'entite', libelle: dictAudit.colonne.entite, triable: true },
  { cle: 'entiteId', libelle: dictAudit.colonne.entiteId, triable: false },
  {
    cle: 'utilisateurEmail',
    libelle: dictAudit.colonne.utilisateur,
    triable: false,
    acceseur: (item) => item.utilisateurEmail ?? '—',
  },
  {
    cle: 'metadonnees',
    libelle: dictAudit.colonne.metadonnees,
    triable: false,
    acceseur: (item) => (item.metadonnees ? JSON.stringify(item.metadonnees).slice(0, 80) : '—'),
  },
];

export function JournalAuditTable({
  entrees,
  meta,
  surChangementPage,
  surTri,
  surReessayer,
}: JournalAuditTableProps): JSX.Element {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
      <DataTable<AuditEntree>
        colonnes={COLONNES}
        donnees={entrees}
        etat="chargement"
        meta={meta}
        surTri={surTri}
        surChangementPage={surChangementPage}
        surReessayer={surReessayer}
        libelleVide={dictAudit.etat.vide}
        ariaLabel="Journal d’audit"
      />
      <nav style={{ marginTop: 'var(--space-xs)', display: 'flex', justifyContent: 'flex-end' }}>
        <Paginator
          page={meta.page}
          total={Math.max(1, Math.ceil(meta.total / meta.pageSize))}
          totalItems={meta.total}
          onChange={surChangementPage}
        />
      </nav>
    </section>
  );
}
