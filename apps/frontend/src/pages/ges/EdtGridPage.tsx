// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bouton } from '@/components/atoms/Bouton';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { EtatVide } from '@/components/molecules/EtatVide';
import { SelecteurVersion } from '@/pages/SelecteurVersion';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import {
  planningApi,
  type Seance,
  type Bail,
  type Creneau,
  type Lock,
} from '@/lib/planning.api';
import { CelluleGrille, construireGrille } from '@/lib/ges/edt';
import { GrilleEDT } from './GrilleEDT';
import { VerrouBadge } from './VerrouBadge';
import { type Conflit } from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.ges.edt as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

interface EdtGridPageProps {
  readonly versionId?: string;
}

export function EdtGridPage({ versionId: versionIdDepuisUrl }: EdtGridPageProps): JSX.Element {
  const queryClient = useQueryClient();

  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );
  const [salleSelectionneeId, setSalleSelectionneeId] = useState<string | null>(
    null,
  );
  const [intervalId, setIntervalId] = useState<
    ReturnType<typeof setInterval> | null
  >(null);

  const BAIL_ALERTE_AVANT_EXPIRATION_MS = 5 * 60 * 1000;

  function estBailExpire(bail: { dateFin: string }, maintenant: Date): boolean {
    return new Date(bail.dateFin).getTime() <= maintenant.getTime();
  }

  function estBailProcheExpiration(
    bail: { dateFin: string },
    maintenant: Date,
    seuilMs = BAIL_ALERTE_AVANT_EXPIRATION_MS,
  ): boolean {
    return (
      new Date(bail.dateFin).getTime() - maintenant.getTime() <= seuilMs
    );
  }

  function secondesRestantesBail(
    bail: { dateFin: string },
    maintenant: Date,
  ): number {
    const reste = new Date(bail.dateFin).getTime() - maintenant.getTime();
    return Math.max(0, Math.floor(reste / 1000));
  }

  function formaterCompteARebours(
    bail: { dateFin: string },
    maintenant: Date,
  ): string {
    const secondes = secondesRestantesBail(bail, maintenant);
    const minutes = Math.floor(secondes / 60);
    const secs = secondes % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  const { data: creneauxData, isLoading: creneauxChargement } = useQuery({
    queryKey: ['referentiels', 'creneaux'],
    queryFn: () => planningApi.listerCreneaux(),
    staleTime: 10 * 60 * 1000,
  });

  const creneaux: readonly Creneau[] = (creneauxData?.items ?? []) as Creneau[];

  const {
    data: seancesData,
    isLoading: seancesChargement,
    refetch: refetchSeances,
  } = useQuery({
    queryKey: ['seances', versionId],
    queryFn: () =>
      planningApi.listerSeances({
        versionId: versionId ?? '',
        page: 1,
        pageSize: 200,
      }),
    enabled: !!versionId,
    staleTime: 30 * 1000,
  });

  const seances: readonly Seance[] = (seancesData?.items ?? []) as Seance[];

  const {
    data: verrousData,
    isLoading: verrousChargement,
    refetch: refetchVerrous,
  } = useQuery({
    queryKey: ['locks', versionId],
    queryFn: () =>
      planningApi.listerVerrous({
        versionId: versionId ?? '',
        page: 1,
        pageSize: 200,
      }),
    enabled: !!versionId,
    staleTime: 30 * 1000,
  });

  const verrous: readonly Lock[] = (verrousData?.items ?? []) as Lock[];
  const {
    data: bailData,
    isPending: bailAcquisitionEnCours,
    mutate: acquerirBail,
  } = useMutation({
    mutationFn: (vid: string) => planningApi.acquerirBail(vid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locks', versionId] });
    },
  });

  const {
    mutate: renouvelerBail,
    isPending: bailRenouvellementEnCours,
  } = useMutation({
    mutationFn: (vid: string) => planningApi.renouvelerBail(vid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locks', versionId] });
    },
  });

  const {
    mutate: libererBail,
    isPending: bailLiberationEnCours,
  } = useMutation({
    mutationFn: (vid: string) => planningApi.libererBail(vid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['locks', versionId] });
    },
  });

  const bail: Bail | null = bailData ?? null;
  const bailActif = bail !== null && !estBailExpire(bail, new Date());
  const bailProcheExpiration =
    bail !== null && estBailProcheExpiration(bail, new Date());

  useEffect(() => {
    if (bail && !estBailExpire(bail, new Date())) {
      const id = setInterval(() => {}, 1000);
      setIntervalId(id);
      return () => clearInterval(id);
    }
    if (intervalId) clearInterval(intervalId);
  }, [bail, intervalId]);
  const seanceSelectionnee = useMemo(
    () => seances.find((s) => s.id === salleSelectionneeId) ?? null,
    [seances, salleSelectionneeId],
  );

  const gererAcquisitionBail = useCallback(() => {
    if (!versionId) return;
    void acquerirBail(versionId);
  }, [versionId, acquerirBail]);

  const gererRenouvellementBail = useCallback(() => {
    if (!versionId) return;
    void renouvelerBail(versionId);
  }, [versionId, renouvelerBail]);

  const gererLiberationBail = useCallback(() => {
    if (!versionId) return;
    void libererBail(versionId);
  }, [versionId, libererBail]);

  const gererSelectionVersion = useCallback((id: string) => {
    setVersionId(id);
    setSalleSelectionneeId(null);
  }, []);

  const gererSelectionSeance = useCallback((id: string | null) => {
    setSalleSelectionneeId(id);
  }, []);

  const gererSeanceDeplacee = useCallback(() => {
    void refetchSeances();
    void refetchVerrous();
  }, [refetchSeances, refetchVerrous]);

  const gererConflitDetecte = useCallback((conflits: readonly Conflit[]) => {
    console.log('Conflits détectés:', conflits);
  }, []);

  const cellules: readonly CelluleGrille[] = useMemo(
    () => construireGrille(creneaux, seances),
    [creneaux, seances],
  );

  const chargement =
    creneauxChargement ||
    seancesChargement ||
    verrousChargement ||
    bailAcquisitionEnCours;

  if (chargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (!versionId) {
    return (
      <div style={{ padding: 'var(--space-l)' }}>
        <h1>{t('titre')}</h1>
        <p>{t('sousTitre')}</p>
        <p>{t('selectionnerVersion')}</p>
      </div>
    );
  }

  if (seances.length === 0 && creneaux.length === 0) {
    return (
      <div style={{ padding: 'var(--space-l)' }}>
        <h1>{t('titre')}</h1>
        <EtatVide titre={t('vide')} message={t('aucuneDonnee')} />
      </div>
    );
  }

  const compteARebours = bail
    ? formaterCompteARebours(bail, new Date())
    : null;

  return (
    <div
      style={{
        padding: 'var(--space-l)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-l)',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
        <SelecteurVersion
          versionIdSelectionnee={versionId ?? undefined}
          surSelection={gererSelectionVersion}
        />
        <h1>{t('titre')}</h1>
        <p>{t('sousTitre')}</p>
      </header>
      <section style={{ display: 'flex', gap: 'var(--space-l)', alignItems: 'flex-start', flex: 1, minHeight: 0 }}>
        <aside style={{ width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <h2 style={{ fontSize: 'var(--font-size-h3)', margin: 0 }}>
            {t('seancesNonPlacees') ?? 'Séances à placer'}
          </h2>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              border: `var(--border-width) solid var(--color-border)`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-s)',
              background: 'var(--color-surface)',
            }}
          >
            {seances.filter((s) => !s.salleId).length === 0 ? (
              <div
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-text-secondary)',
                  padding: 'var(--space-s)',
                }}
              >
                {t('toutesSeancesPlacees') ?? 'Toutes les séances sont placées.'}
              </div>
            ) : (
              seances
                .filter((s) => !s.salleId)
                .map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: 'var(--space-s)',
                      border: `var(--border-width) solid var(--color-border)`,
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-xs)',
                      cursor: 'grab',
                      fontSize: 'var(--font-size-body)',
                    }}
                    onClick={() => gererSelectionSeance(s.id)}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {s.matiere?.libelle ?? s.matiereId ?? t('matiereNonDefinie')}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-caption)', opacity: 0.85 }}>
                      {s.enseignant?.nom ?? s.enseignantId ?? t('enseignantNonDefinie')}
                    </div>
                  </div>
                ))
            )}
          </div>
        </aside>

        <section style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <GrilleEDT
            cellules={cellules}
            creneaux={creneaux}
            versionId={versionId}
            utilisateurId={bail?.utilisateurId ?? ''}
            bail={bail}
            verrous={verrous}
            chargement={chargement}
            estBailValide={bailActif}
            onSeanceDeplacee={gererSeanceDeplacee}
            onConflitDetecte={gererConflitDetecte}
          />
        </section>
        {seanceSelectionnee && (
          <aside
            style={{
              width: '320px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-s)',
            }}
          >
            <h2 style={{ fontSize: 'var(--font-size-h3)', margin: 0 }}>
              {t('detailsSeance') ?? 'Détails de la séance'}
            </h2>
            <div
              style={{
                border: `var(--border-width) solid var(--color-border)`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-s)',
                background: 'var(--color-surface)',
                flex: 1,
                overflowY: 'auto',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
                {seanceSelectionnee.matiere?.libelle ?? seanceSelectionnee.matiereId ?? ''}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-s)',
                }}
              >
                {seanceSelectionnee.enseignant?.nom ?? seanceSelectionnee.enseignantId ?? ''} •{' '}
                {seanceSelectionnee.salle?.libelle ?? seanceSelectionnee.salleId ?? t('salleNonDefinie')}
              </div>
              {seanceSelectionnee.verrous.length > 0 && (
                <div
                  style={{
                    marginTop: 'var(--space-s)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                  }}
                >
                  {seanceSelectionnee.verrous.map((v) => (
                    <VerrouBadge
                      key={v.id}
                      verrou={v}
                      utilisateurConnecteId={bail?.utilisateurId ?? ''}
                    />
                  ))}
                </div>
              )}
            </div>
            <Bouton
              variante="contour"
              libelle={t('fermer') ?? 'Fermer'}
              onClick={() => gererSelectionSeance(null)}
            />
          </aside>
        )}
      </section>

      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-s)',
          paddingTop: 'var(--space-s)',
          borderTop: `var(--border-width) solid var(--color-border)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-s)',
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {bail ? (
            <>
              <span>
                {t('bailDetenteur') ?? 'Bail détenu par'}: {bail.detenteur}
              </span>
              {compteARebours && (
                <span>
                  {t('bailExpiration') ?? 'Expiration'}: {compteARebours}
                  {bailProcheExpiration &&
                    ` (${t('bailRenouveler') ?? 'renouveler'})`}
                </span>
              )}
            </>
          ) : (
            <span>{t('bailAucun') ?? 'Aucun bail d’édition'}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-s)' }}>
          {!bailActif && (
            <Bouton
              variante="primaire"
              libelle={t('bailAcquerir') ?? 'Acquérir le bail'}
              onClick={gererAcquisitionBail}
              disabled={bailAcquisitionEnCours || !versionId}
            />
          )}
          {bailActif && bailProcheExpiration && (
            <Bouton
              variante="contour"
              libelle={t('bailRenouveler') ?? 'Renouveler'}
              onClick={gererRenouvellementBail}
              disabled={bailRenouvellementEnCours}
            />
          )}
          {bailActif && (
            <Bouton
              variante="fantome"
              libelle={t('bailLiberer') ?? 'Libérer'}
              onClick={gererLiberationBail}
              disabled={bailLiberationEnCours}
            />
          )}
        </div>
      </footer>
    </div>
  );
}
