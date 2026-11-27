// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  useCallback,
  useRef,
  useState,
  type JSX,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bouton,
} from '@/components/atoms/Bouton';
import {
  Alerte,
} from '@/components/atoms/Alerte';
import {
  Icone,
} from '@/components/atoms/Icone';
import {
  Modal,
} from '@/components/molecules/Modal';
import {
  EtatChargement,
} from '@/components/molecules/EtatChargement';
import {
  EtatErreur,
} from '@/components/molecules/EtatErreur';
import { Select } from '@/components/atoms/Select';
import { DataTable } from '@/components/molecules/DataTable/DataTable';
import type { MetaPagination } from '@/components/molecules/DataTable/DataTable.types';
import { traduction } from '@/i18n/fr';
import {
  publicationApi,
  type VersionItem,
  type ActionTransition,
} from '@/lib/publication.api';

type CodeEcran = 'EC-GES-09' | 'EC-GES-10' | 'EC-GES-11';

interface PublishArchiveExportPageProps {
  readonly code: CodeEcran;
}

const DICO = (traduction('ges') as unknown as Record<string, unknown>) as {
  publication: Record<string, string>;
  archivage: Record<string, string>;
  exports: Record<string, string>;
};

function t(cle: string): string {
  const valeur =
    DICO.publication?.[cle] ??
    DICO.archivage?.[cle] ??
    DICO.exports?.[cle];
  return typeof valeur === 'string' ? valeur : cle;
}

export function PublishArchiveExportPage({
  code,
}: PublishArchiveExportPageProps): JSX.Element {
  const estPublication = code === 'EC-GES-09';
  const estArchivage = code === 'EC-GES-10';
  const estExports = code === 'EC-GES-11';

  const queryClient = useQueryClient();

  /*───── Données versions ─────*/
  const {
    data: versionsData,
    isLoading: versionsChargement,
    error: versionsErreur,
    refetch: refetchVersions,
  } = useQuery<{ items: VersionItem[]; meta: MetaPagination }, Error>({
    queryKey: ['publication', 'versions', code],
    queryFn: async () => {
      const liste = await publicationApi.listerVersions({
        page: 1,
        pageSize: 100,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      });
      return { items: liste.items, meta: liste.meta };
    },
  });

  const versions = versionsData?.items ?? [];
  const [versionSelectionnee, setVersionSelectionnee] = useState<
    VersionItem | null
  >(null);

  /*───── État mutation ─────*/
  const [messageSucces, setMessageSucces] = useState<string | undefined>();
  const [messageErreur, setMessageErreur] = useState<string | undefined>();
  /*───── Mutations ─────*/
  const {
    mutateAsync: executerTransition,
    isPending: transitionEnCours,
  } = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: ActionTransition }) => {
      return publicationApi.transitionnerVersion(id, action);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['publication', 'versions', code],
      });
      setModalOuverte(false);
      setMessageSucces(
        modalAction === 'publier' ? t('publicationSucces') : t('archivageSucces'),
      );
      setVersionSelectionnee(null);
    },
    onError: (erreur: Error) => {
      setMessageErreur(erreur.message || 'Echec de l action.');
      setModalOuverte(false);
    },
  });

  const {
    mutateAsync: executerDuplication,
    isPending: duplicationEnCours,
  } = useMutation({
    mutationFn: (id: string) => publicationApi.dupliquerVersionArchivee(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['publication', 'versions', code],
      });
      setModalOuverte(false);
      setMessageSucces(t('duplicationSucces'));
      setVersionSelectionnee(null);
    },
    onError: (erreur: Error) => {
      setMessageErreur(erreur.message || 'Echec de la duplication.');
      setModalOuverte(false);
    },
  });

  const [modalOuverte, setModalOuverte] = useState(false);
  const [modalAction, setModalAction] = useState<
    'publier' | 'archiver' | 'dupliquer' | null
  >(null);
  /*───── Exports ─────*/
  const [formatExport, setFormatExport] = useState<'xlsx' | 'pdf' | 'ics'>(
    'xlsx',
  );
  const exportEnCoursRef = useRef(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportExpiresAt, setExportExpiresAt] = useState<string | null>(null);

  const {
    data: exportsData,
    isLoading: exportsChargement,
    error: exportsErreur,
    refetch: refetchExports,
  } = useQuery<{ items: unknown[]; meta: MetaPagination }, Error>({
    queryKey: ['publication', 'exports', versionSelectionnee?.id],
    queryFn: async () => {
      if (!versionSelectionnee) {
        return { items: [], meta: { page: 1, pageSize: 20, total: 0 } };
      }
      const liste = await publicationApi.listerExports({
        page: 1,
        pageSize: 50,
        format: undefined,
      });
      return { items: liste.items, meta: liste.meta };
    },
    enabled: !!versionSelectionnee && estExports,
  });

  /*───── Handlers ─────*/
  const gererSelectionVersion = useCallback((v: VersionItem) => {
    setVersionSelectionnee(v);
    setMessageSucces(undefined);
    setMessageErreur(undefined);
  }, []);

  const gererPublier = useCallback(async () => {
    if (!versionSelectionnee) return;
    if (versionSelectionnee.etat !== 'valide') {
      setMessageErreur(t('erreurEtatNonValide'));
      return;
    }
    setModalAction('publier');
    setModalOuverte(true);
  }, [versionSelectionnee]);

  const gererArchiver = useCallback(async () => {
    if (!versionSelectionnee) return;
    if (!['valide', 'publie'].includes(versionSelectionnee.etat)) {
      setMessageErreur(t('erreurEtatNonArchivable'));
      return;
    }
    setModalAction('archiver');
    setModalOuverte(true);
  }, [versionSelectionnee]);

  const gererDupliquer = useCallback(async () => {
    if (!versionSelectionnee) return;
    if (versionSelectionnee.etat !== 'archive') {
      setMessageErreur(t('erreurEtatNonDuplicable'));
      return;
    }
    setModalAction('dupliquer');
    setModalOuverte(true);
  }, [versionSelectionnee]);

  const confirmerAction = useCallback(async () => {
    if (!versionSelectionnee || !modalAction) return;
    try {
      if (modalAction === 'publier') {
        await executerTransition({ id: versionSelectionnee.id, action: 'publier' });
      } else if (modalAction === 'archiver') {
        const action =
          versionSelectionnee.etat === 'publie' ? 'archiver' : 'archiverSansPublier';
        await executerTransition({ id: versionSelectionnee.id, action });
      } else if (modalAction === 'dupliquer') {
        await executerDuplication(versionSelectionnee.id);
      }
    } catch {
      // Erreur deja geree par onError des mutations
    }
  }, [versionSelectionnee, modalAction, executerTransition, executerDuplication]);

  const genererExport = useCallback(async () => {
    if (!versionSelectionnee) return;
    exportEnCoursRef.current = true;
    setExportUrl(null);
    setExportExpiresAt(null);
    try {
      const resultat = await publicationApi.preparerExport({
        versionId: versionSelectionnee.id,
        format: formatExport,
      });
      setExportUrl(resultat.url);
      setExportExpiresAt(resultat.expiresAt);
      setMessageSucces(t('exportSucces'));
      await refetchExports?.();
    } catch (erreur) {
      setMessageErreur(
        erreur instanceof Error ? erreur.message : t('exportEchec'),
      );
    } finally {
      exportEnCoursRef.current = false;
    }
  }, [versionSelectionnee, formatExport, refetchExports]);

  /*───── Rendu ─────*/
  const enChargement =
    versionsChargement ||
    exportsChargement ||
    transitionEnCours ||
    duplicationEnCours ||
    exportEnCoursRef.current;

  if (enChargement) {
    return (
      <section
        style={{
          padding: 'var(--space-l)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-m)',
        }}
      >
        <EtatChargement libelle={t('chargement')} />
      </section>
    );
  }

  if (versionsErreur || exportsErreur) {
    return (
      <section style={{ padding: 'var(--space-l)' }}>
        <EtatErreur
          titre={t('erreurTitre')}
          message={
            (versionsErreur ??
              exportsErreur?.message ??
              t('erreurGenerique')) as string
          }
          onReessayer={() => {
            refetchVersions();
            refetchExports?.();
          }}
        />
      </section>
    );
  }

  const titreEcran =
    estPublication ? t('titrePublication') :
    estArchivage ? t('titreArchivage') :
    t('titreExports');

  return (
    <section
      data-testid={`ec-${code}`}
      style={{
        padding: 'var(--space-l)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-l)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-s)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-h1)',
              fontWeight: 600,
              margin: 0,
              color: 'var(--color-text-primary)',
            }}
          >
            {titreEcran}
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-secondary)',
              margin: 'var(--space-xxs) 0 0 0',
            }}
          >
            {estPublication
              ? t('sousTitrePublication')
              : estArchivage ? t('sousTitreArchivage') : t('sousTitreExports')}
          </p>
        </div>
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-s)',
          }}
          aria-label="Fil d Ariane"
        >
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Tableau de bord
          </span>
          <Icone nom="chevron-bas" taille={14} ariaLabel="Separateur" />
          <span
            style={{
              fontSize: 'var(--font-size-caption)',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
            }}
          >
            {titreEcran}
          </span>
        </nav>
      </header>

      {messageSucces && (
        <Alerte
          variante="succès"
          titre="Succès"
          message={messageSucces}
          fermable={true}
          onFermer={() => setMessageSucces(undefined)}
        />
      )}
      {messageErreur && (
        <Alerte
          variante="erreur"
          titre="Erreur"
          message={messageErreur}
          fermable={true}
          onFermer={() => setMessageErreur(undefined)}
        />
      )}

      {estPublication && (
        <PanneauPublication
          versions={versions}
          selectionnerVersion={gererSelectionVersion}
          publier={gererPublier}
        />
      )}
      {estArchivage && (
        <PanneauArchivage
          versions={versions}
          selectionnerVersion={gererSelectionVersion}
          archiver={gererArchiver}
          dupliquer={gererDupliquer}
        />
      )}
      {estExports && (
        <PanneauExports
          versions={versions}
          selectionnerVersion={gererSelectionVersion}
          versionSelectionnee={versionSelectionnee}
          formatExport={formatExport}
          setFormatExport={setFormatExport}
          genererExport={genererExport}
          exportEnCours={exportEnCoursRef.current}
          exportUrl={exportUrl}
          exportExpiresAt={exportExpiresAt}
          exportsData={exportsData?.items ?? []}
          meta={exportsData?.meta}
        />
      )}

      <Modal
        ouvert={modalOuverte}
        titre={
          modalAction === 'publier'
            ? t('confirmerPublicationTitre')
            : modalAction === 'archiver'
            ? t('confirmerArchivageTitre')
            : t('confirmerDuplicationTitre')
        }
        onFermer={() => setModalOuverte(false)}
        libelleValider={t('confirmer')}
        onValider={confirmerAction}
      >
        <p style={{ margin: 0, fontSize: 'var(--font-size-body)' }}>
          {modalAction === 'publier'
            ? t('confirmerPublicationMessage')
            : modalAction === 'archiver'
            ? t('confirmerArchivageMessage')
            : t('confirmerDuplicationMessage')}
        </p>
      </Modal>
    </section>
  );
}

/*───── Sous-composants ─────*/

interface PanneauPublicationProps {
  readonly versions: readonly VersionItem[];
  readonly selectionnerVersion: (v: VersionItem) => void;
  readonly publier: () => void;
}

function PanneauPublication({
  versions,
  selectionnerVersion,
  publier,
}: PanneauPublicationProps): JSX.Element {
  const versionsValides = versions.filter((v) => v.etat === 'valide');
  const versionsPubliees = versions.filter((v) => v.etat === 'publie');

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
      }}
    >
      <div
        style={{
          padding: 'var(--space-m)',
          border: 'var(--border-width) solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: '0 0 var(--space-s) 0',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('titreVersionValidee')}
        </h2>
        <p
          style={{
            fontSize: 'var(--font-size-body)',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {t('texteVersionValidee')}
        </p>
        <DataTable
          colonnes={[
            { cle: 'id', libelle: 'Version', triable: true, acceseur: (v) => v.id.substring(0, 8) },
            { cle: 'etat', libelle: 'Etat', triable: true, acceseur: (v) => v.etat },
            { cle: 'datePublication', libelle: 'Date de publication', acceseur: (v) => v.datePublication ?? '-' },
            { cle: 'publiePar', libelle: 'Publie par', acceseur: (v) => v.publiePar ?? '-' },
          ]}
          donnees={versionsValides}
          etat={versionsValides.length === 0 ? 'vide' : 'succès'}
          libelleVide={t('aucuneVersionValide')}
          actions={(v) => (
            <Bouton
              variante="primaire"
              taille="petite"
              disabled={v.etat !== 'valide'}
              libelle={t('boutonPublier')}
              onClick={() => {
                selectionnerVersion(v);
                publier();
              }}
            />
          )}
          ariaLabel="Versions valides a publier"
        />
      </div>

      {versionsPubliees.length > 0 && (
        <div
          style={{
            padding: 'var(--space-m)',
            border: 'var(--border-width) solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 600,
              margin: '0 0 var(--space-s) 0',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('titreVersionsPubliees')}
          </h2>
          <Alerte
            variante="info"
            titre="Information"
            message={t('versionsPublieesImmutables')}
            fermable={false}
          />
          <DataTable
            colonnes={[
              { cle: 'id', libelle: 'Version', triable: true, acceseur: (v) => v.id.substring(0, 8) },
              { cle: 'etat', libelle: 'Etat', triable: true, acceseur: (v) => v.etat },
              { cle: 'datePublication', libelle: 'Date de publication', acceseur: (v) => v.datePublication ?? '-' },
              { cle: 'publiePar', libelle: 'Publie par', acceseur: (v) => v.publiePar ?? '-' },
            ]}
            donnees={versionsPubliees}
            etat="succès"
            libelleVide={t('aucuneVersionPubliee')}
            ariaLabel="Versions deja publiees"
          />
        </div>
      )}
    </section>
  );
}

interface PanneauArchivageProps {
  readonly versions: readonly VersionItem[];
  readonly selectionnerVersion: (v: VersionItem) => void;
  readonly archiver: () => void;
  readonly dupliquer: () => void;
}

function PanneauArchivage({
  versions,
  selectionnerVersion,
  archiver,
  dupliquer,
}: PanneauArchivageProps): JSX.Element {
  const versionsArchivables = versions.filter(
    (v) => v.etat === 'valide' || v.etat === 'publie',
  );
  const versionsArchivees = versions.filter((v) => v.etat === 'archive');

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
      }}
    >
      <div
        style={{
          padding: 'var(--space-m)',
          border: 'var(--border-width) solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: '0 0 var(--space-s) 0',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('titreVersionsArchivables')}
        </h2>
        <DataTable
          colonnes={[
            { cle: 'id', libelle: 'Version', triable: true, acceseur: (v) => v.id.substring(0, 8) },
            { cle: 'etat', libelle: 'Etat', triable: true, acceseur: (v) => v.etat },
            { cle: 'datePublication', libelle: 'Date de publication', acceseur: (v) => v.datePublication ?? '-' },
            { cle: 'publiePar', libelle: 'Publie par', acceseur: (v) => v.publiePar ?? '-' },
          ]}
          donnees={versionsArchivables}
          etat={versionsArchivables.length === 0 ? 'vide' : 'succès'}
          libelleVide={t('aucuneVersionArchivable')}
          actions={(v) => (
            <>
              <Bouton
                variante="contour"
                taille="petite"
                libelle={t('boutonArchiver')}
                onClick={() => {
                  selectionnerVersion(v);
                  archiver();
                }}
              />
              {v.etat === 'archive' && (
                <Bouton
                  variante="secondaire"
                  taille="petite"
                  libelle={t('boutonNouvelleVersion')}
                  onClick={() => {
                    selectionnerVersion(v);
                    dupliquer();
                  }}
                />
              )}
            </>
          )}
          ariaLabel="Versions a archiver"
        />
      </div>

      {versionsArchivees.length > 0 && (
        <div
          style={{
            padding: 'var(--space-m)',
            border: 'var(--border-width) solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 600,
              margin: '0 0 var(--space-s) 0',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('titreVersionsArchivees')}
          </h2>
          <DataTable
            colonnes={[
              { cle: 'id', libelle: 'Version', triable: true, acceseur: (v) => v.id.substring(0, 8) },
              { cle: 'etat', libelle: 'Etat', triable: true, acceseur: (v) => v.etat },
              { cle: 'datePublication', libelle: 'Date de publication', acceseur: (v) => v.datePublication ?? '-' },
            ]}
            donnees={versionsArchivees}
            etat="succès"
            libelleVide={t('aucuneVersionArchivee')}
            ariaLabel="Versions archivees"
          />
        </div>
      )}
    </section>
  );
}

interface PanneauExportsProps {
  readonly versions: readonly VersionItem[];
  readonly selectionnerVersion: (v: VersionItem) => void;
  readonly versionSelectionnee: VersionItem | null;
  readonly formatExport: 'xlsx' | 'pdf' | 'ics';
  readonly setFormatExport: (f: 'xlsx' | 'pdf' | 'ics') => void;
  readonly genererExport: () => void;
  readonly exportEnCours: boolean;
  readonly exportUrl: string | null;
  readonly exportExpiresAt: string | null;
  readonly exportsData: readonly unknown[];
  readonly meta: MetaPagination | undefined;
}

function PanneauExports({
  versions,
  selectionnerVersion,
  versionSelectionnee,
  formatExport,
  setFormatExport,
  genererExport,
  exportEnCours,
  exportUrl,
  exportExpiresAt,
  exportsData,
  meta,
}: PanneauExportsProps): JSX.Element {
  const versionsPubliees = versions.filter((v) => v.etat === 'publie');

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
      }}
    >
      <div
        style={{
          padding: 'var(--space-m)',
          border: 'var(--border-width) solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: '0 0 var(--space-s) 0',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('titreSelectionVersion')}
        </h2>
        <Select
          label={t('labelVersion')}
          value={versionSelectionnee?.id ?? ''}
          options={versionsPubliees.map((v) => ({
            valeur: v.id,
            libelle: `${v.id.substring(0, 8)} (${v.etat})`,
          }))}
          placeholder={t('selectionnerVersionPubliee')}
          disabled={versionsPubliees.length === 0}
          onChange={(valeur) => {
            const v = versionsPubliees.find((x) => x.id === valeur);
            if (v) selectionnerVersion(v);
          }}
        />
        {versionsPubliees.length === 0 && (
          <Alerte
            variante="attention"
            titre="Attention"
            message={t('aucuneVersionPublieePourExport')}
            fermable={false}
          />
        )}
      </div>

      {versionSelectionnee && (
        <div
          style={{
            padding: 'var(--space-m)',
            border: 'var(--border-width) solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 600,
              margin: '0 0 var(--space-s) 0',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('titreFormatExport')}
          </h2>
          <Select
            label={t('labelFormat')}
            value={formatExport}
            options={[
              { valeur: 'xlsx', libelle: 'Excel (XLSX)' },
              { valeur: 'pdf', libelle: 'PDF' },
              { valeur: 'ics', libelle: 'iCalendar (.ics)' },
            ]}
            onChange={(valeur) =>
              setFormatExport(valeur as 'xlsx' | 'pdf' | 'ics')
            }
          />
          <Bouton
            variante="primaire"
            disabled={exportEnCours}
            chargement={exportEnCours}
            libelle={t('boutonGenererTelecharger')}
            onClick={genererExport}
          />
        </div>
      )}

      {exportUrl && (
        <div
          style={{
            padding: 'var(--space-m)',
            border: 'var(--border-width) solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 600,
              margin: '0 0 var(--space-s) 0',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('titreExportPret')}
          </h2>
          <p style={{ fontSize: 'var(--font-size-body)', margin: '0 0 var(--space-s) 0' }}>
            {t('messageExportPret')}
          </p>
          <a
            href={exportUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'underline',
              fontSize: 'var(--font-size-body)',
            }}
          >
            {t('lienTelecharger')}
          </a>
          {exportExpiresAt && (
            <p
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-text-secondary)',
                margin: 'var(--space-xs) 0 0 0',
              }}
            >
              {`${t('expirationExport')} ${exportExpiresAt}`}
            </p>
          )}
        </div>
      )}

      <div
        style={{
          padding: 'var(--space-m)',
          border: 'var(--border-width) solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: '0 0 var(--space-s) 0',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('titreHistoriqueExports')}
        </h2>
        <DataTable
          colonnes={[
            {
              cle: 'id',
              libelle: 'Export',
              triable: true,
              acceseur: (e: unknown) =>
                (e as { id: string }).id.substring(0, 8),
            },
            {
              cle: 'format',
              libelle: 'Format',
              triable: true,
              acceseur: (e: unknown) => (e as { format: string }).format,
            },
            {
              cle: 'dateGeneration',
              libelle: 'Date',
              triable: true,
              acceseur: (e: unknown) =>
                (e as { dateGeneration: string }).dateGeneration,
            },
            {
              cle: 'statut',
              libelle: 'Statut',
              triable: true,
              acceseur: (e: unknown) =>
                (e as { statut?: string }).statut ?? '-',
            },
          ]}
          donnees={exportsData}
          etat={exportsData.length === 0 ? 'vide' : 'succès'}
          meta={meta}
          libelleVide={t('aucunExportHistorique')}
          ariaLabel="Historique des exports"
        />
      </div>
    </section>
  );
}

export default PublishArchiveExportPage;

