// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import React, {
  useCallback,
  useState,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bouton } from '@/components/atoms/Bouton';
import { Input } from '@/components/atoms/Input';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { EtatVide } from '@/components/molecules/EtatVide';
import { SelecteurVersion } from '@/pages/SelecteurVersion';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import {
  planningApi,
  type Seance,
} from '@/lib/planning.api';
import { trierAlternatives } from '@/lib/ges/edt';
import {
  type AlternativePlacement,
  type SimulationReponse,
} from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.ges.conflits as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

interface ConflictSimulationPageProps {
  readonly versionId?: string;
}

interface SimulationPayload {
  readonly seanceId: string;
  readonly body: {
    readonly nbCreneaux: number;
    readonly cibleSalleId?: string;
    readonly nbAlternativesMax: number;
  };
}

export function ConflictSimulationPage({ versionId: versionIdDepuisUrl }: ConflictSimulationPageProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const [versionId, setVersionId] = useState<string | null>(versionIdDepuisUrl ?? null);
  const [seanceIdSelectionnee, setSeanceIdSelectionnee] = useState<string | null>(null);
  const [nbCreneaux, setNbCreneaux] = useState(1);
  const [nbAlternativesMax, setNbAlternativesMax] = useState(5);

  const {
    data: seancesData,
    isLoading: seancesChargement,
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

  const [simulationEnCours, setSimulationEnCours] = useState(false);
  const [alternatives, setAlternatives] = useState<readonly AlternativePlacement[]>([]);

  const { mutate: simuler, isPending: simulationMutationEnCours } =
    useMutation<SimulationReponse, Error, SimulationPayload>({
      mutationFn: ({ seanceId, body }) =>
        planningApi.simuler(seanceId, body as never),
      onSuccess: (reponse) => {
        setAlternatives(reponse.alternatives ?? []);
        void queryClient.invalidateQueries({ queryKey: ['seances', versionId] });
      },
      onError: () => {
        setAlternatives([]);
      },
    });

  const gererSelectionVersion = useCallback((id: string) => {
    setVersionId(id);
    setSeanceIdSelectionnee(null);
    setAlternatives([]);
  }, []);

  const gererSelectionSeance = useCallback((id: string | null) => {
    setSeanceIdSelectionnee(id);
    setAlternatives([]);
  }, []);

  const gererSimulation = useCallback(async () => {
    if (!seanceIdSelectionnee) return;
    setSimulationEnCours(true);
    setAlternatives([]);
    try {
      await simuler({
        seanceId: seanceIdSelectionnee,
        body: {
          nbCreneaux,
          cibleSalleId: undefined,
          nbAlternativesMax,
        },
      });
    } finally {
      setSimulationEnCours(false);
    }
  }, [seanceIdSelectionnee, nbCreneaux, nbAlternativesMax, simuler]);
  if (seancesChargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (!versionId) {
    return (
      <div>
        <h1>{t('titreSimulation') ?? 'Simulation de conflits'}</h1>
        <p>{t('selectionnerVersion')}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
        <SelecteurVersion
          versionIdSelectionnee={versionId ?? undefined}
          surSelection={gererSelectionVersion}
        />
        <h1>{t('titreSimulation') ?? 'Simulation de conflits'}</h1>
        <p>{t('sousTitreSimulation') ?? 'Testez un déplacement de séance avant de le valider.'}</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-l)', alignItems: 'start' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <h2 style={{ fontSize: 'var(--font-size-h3)', margin: 0 }}>
            {t('choisirSeance') ?? 'Choisir une séance'}
          </h2>
          <div style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-s)', background: 'var(--color-surface)', flex: 1, overflowY: 'auto' }}>
            {seances.length === 0 ? (
              <div style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', padding: 'var(--space-s)' }}>
                {t('aucuneSeance') ?? 'Aucune séance pour cette version.'}
              </div>
            ) : (
              seances.map((s) => {
                const estSelectionnee = s.id === seanceIdSelectionnee;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => gererSelectionSeance(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-s)',
                      padding: 'var(--space-s)',
                      border: `var(--border-width) solid ${estSelectionnee ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: estSelectionnee ? 'var(--color-primary-light)' : 'transparent',
                      color: 'var(--color-text-primary)',
                      cursor: 'pointer',
                      fontSize: 'var(--font-size-body)',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div style={{ fontWeight: 600, flex: 1 }}>
                      {s.matiere?.libelle ?? s.matiereId ?? t('matiereNonDefinie')}
                    </div>
                    <span style={{ fontSize: 'var(--font-size-caption)', opacity: 0.85 }}>
                      J{s.jour}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <div style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-s)', background: 'var(--color-surface)' }}>
            <h2 style={{ fontSize: 'var(--font-size-h3)', margin: '0 0 var(--space-s) 0' }}>
              {t('parametresSimulation') ?? 'Paramètres'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
              <label style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600 }}>
                {t('nombreCreneaux') ?? 'Nombre de créneaux'}
              </label>
              <Input
                type="number"
                label={t('nombreCreneaux') ?? 'Nombre de créneaux'}
                value={String(nbCreneaux)}
                onChange={(v) => setNbCreneaux(Math.max(1, Number(v || 1)))}
              />
              <label style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600 }}>
                {t('alternativesMax') ?? 'Alternatives max'}
              </label>
              <Input
                type="number"
                label={t('alternativesMax') ?? 'Alternatives max'}
                value={String(nbAlternativesMax)}
                onChange={(v) =>
                  setNbAlternativesMax(Math.max(1, Math.min(20, Number(v || 1))))
                }
              />
            </div>
            <Bouton
              variante="primaire"
              libelle={t('lancerSimulation') ?? 'Lancer la simulation'}
              onClick={gererSimulation}
              disabled={simulationEnCours || simulationMutationEnCours || !seanceIdSelectionnee}
            />
          </div>

          {alternatives.length > 0 && (
            <div style={{ border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-s)', background: 'var(--color-surface)', flex: 1, overflowY: 'auto' }}>
              <h2 style={{ fontSize: 'var(--font-size-h3)', margin: '0 0 var(--space-s) 0' }}>
                {t('resultatsSimulation') ?? 'Alternatives de placement'}
              </h2>
              <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-s)' }}>
                {alternatives.length} alternative(s) classée(s) par score.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {trierAlternatives(alternatives as readonly AlternativePlacement[]).map((a) => (
                  <div
                    key={String(a.candidat.creneauDebutId)}
                    style={{
                      padding: 'var(--space-s)',
                      border: 'var(--border-width) solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-variant)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                      <span style={{ fontWeight: 600 }}>
                        {t('scoreGlobal') ?? 'Score global'}:
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {a.score.toFixed(0)} / 100
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-s)', fontSize: 'var(--font-size-caption)' }}>
                      <div>
                        {t('continuite') ?? 'Continuité'}: {a.sousScores.continuite.toFixed(0)}
                      </div>
                      <div>
                        {t('heuresTardives') ?? 'Heures tardives'}: {a.sousScores.heuresTardives.toFixed(0)}
                      </div>
                      <div>
                        {t('preferences') ?? 'Préférences'}: {a.sousScores.preferences.toFixed(0)}
                      </div>
                    </div>
                    {a.conflitsResiduels.length > 0 && (
                      <div style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-warning)' }}>
                        {a.conflitsResiduels.length} conflit(s) résiduel(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {simulationEnCours && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
              Simulation en cours…
            </div>
          )}
          {alternatives.length === 0 &&
            seanceIdSelectionnee &&
            !simulationEnCours &&
            !simulationMutationEnCours && (
              <EtatVide
                titre={t('aucunResultat') ?? 'Aucun résultat'}
                message={
                  t('lancerSimulationMessage') ??
                  'Lancez une simulation pour voir les alternatives de placement.'
                }
              />
            )}
        </section>
      </section>
    </div>
  );
}
