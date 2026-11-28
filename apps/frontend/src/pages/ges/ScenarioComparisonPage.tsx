// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  useCallback,
  useMemo,
  useState,
  type JSX,
} from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelecteurVersion } from '@/pages/SelecteurVersion';
import { DataTable } from '@/components/molecules/DataTable/DataTable';
import { Alerte } from '@/components/atoms/Alerte';
import { EtatVide } from '@/components/molecules/EtatVide';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { generationApi } from '@/lib/generation.api';
import { repartitionApi } from '@/lib/repartition.api';
import {
  type GenerationItem,
  type Scenario,
  type Salle,
  type Enseignant,
} from '@takt/contracts';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import {
  estimerNonPlacees,
  calculerScoreQualite,
  calculerScoreEquilibrage,
} from '@/lib/ges/comparaisonScenarios';
import { ComparateurScenarios } from './ComparateurScenarios';

const DICO = DICTIONNAIRE_FR.ges.scenarios as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

const LIBELLE_STATUT = (statut: string): string => {
  switch (statut) {
    case 'EN_COURS':
      return 'En cours';
    case 'TERMINEE':
      return 'Terminée';
    case 'ECHEC':
      return 'Échec';
    case 'ANNULEE':
      return 'Annulée';
    default:
      return statut;
  }
};

interface ScenarioAvecMetadonnees extends Scenario {
  generationId: string;
  generationStatut: string;
  scoreQualite: number;
  scoreEquilibrage: number;
  nbNonPlaceesEstimees: number;
}

export function ScenarioComparisonPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionIdDepuisUrl = searchParams.get('versionId') ?? undefined;

  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );
  const [salles, setSalles] = useState<Salle[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [scenariosSelectionnes, setScenariosSelectionnes] = useState<
    string[]
  >([]);
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState<string | null>(null);

  const {
    data: sallesData,
    isLoading: sallesChargement,
    error: sallesErreur,
  } = useQuery({
    queryKey: ['referentiels', 'salles'],
    queryFn: () => repartitionApi.listerSalles(),
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: enseignantsData,
    isLoading: enseignantsChargement,
    error: enseignantsErreur,
  } = useQuery({
    queryKey: ['referentiels', 'enseignants'],
    queryFn: () => repartitionApi.listerEnseignants(),
    staleTime: 10 * 60 * 1000,
  });

  useCallback(() => {
    if (sallesData?.items) setSalles(sallesData.items);
  }, [sallesData]);
  useCallback(() => {
    if (enseignantsData?.items) setEnseignants(enseignantsData.items);
  }, [enseignantsData]);

  // Générations de la version sélectionnée
  const {
    data: generationsData,
    isLoading: generationsChargement,
    error: generationsErreur,
    refetch: refetchGenerations,
  } = useQuery({
    queryKey: ['generations', versionId],
    queryFn: () => generationApi.lister(versionId ?? ''),
    enabled: !!versionId,
    retry: 2,
  });

  const generations = (generationsData?.items ?? []) as GenerationItem[];

  // Scénarios de toutes les générations (chargés en parallèle)
  const generationIds = generations.map((g) => g.id);

  const {
    data: scenariosParGeneration,
    error: scenariosErreur,
  } = useQuery({
    queryKey: ['scenarios', ...generationIds],
    queryFn: async () => {
      const resultats = await Promise.all(
        generationIds.map((id) =>
          generationApi.listerScenarios(id).then((r) => ({
            generationId: id,
            scenarios: r.items,
          })),
        ),
      );
      return resultats;
    },
    enabled: generationIds.length > 0,
    retry: 2,
  });

  // Platrière : tous les scénarios avec métadonnées
  const tousLesScenarios = useMemo<ScenarioAvecMetadonnees[]>(() => {
    const salleMap = new Map<string, Salle>();
    for (const s of salles) salleMap.set(s.id, s);
    const enseignantMap = new Map<string, Enseignant>();
    for (const e of enseignants) enseignantMap.set(e.id, e);

    const liste: ScenarioAvecMetadonnees[] = [];
    for (const pg of scenariosParGeneration ?? []) {
      const generation = generations.find((g) => g.id === pg.generationId);
      for (const s of pg.scenarios) {
        const couverture =
          typeof s.sousScores?.coverage === 'number'
            ? s.sousScores.coverage
            : 0;
        liste.push({
          ...s,
          generationId: pg.generationId,
          generationStatut: generation?.statut ?? 'INCONNUE',
          scoreQualite: calculerScoreQualite(s.sousScores ?? {}),
          scoreEquilibrage: calculerScoreEquilibrage(s.sousScores ?? {}),
          nbNonPlaceesEstimees: estimerNonPlacees(
            couverture,
            s.placements?.length ?? 0,
          ),
        });
      }
    }
    return liste;
  }, [scenariosParGeneration, generations, salles, enseignants]);

  const { mutate: adopter, isPending: adoptionEnCours } = useMutation({
    mutationFn: ({
      generationId,
      scenarioId,
    }: {
      generationId: string;
      scenarioId: string;
    }) => generationApi.adopterScenario(generationId, scenarioId),
    onSuccess: () => {
      setMessageSucces(t('adopterSucces'));
      setMessageErreur(null);
      void refetchGenerations();
    },
    onError: (err) => {
      setMessageErreur(
        err instanceof Error ? err.message : t('adopterErreur'),
      );
      setMessageSucces(null);
    },
  });

  const gererAdoption = useCallback(
    (generationId: string, scenarioId: string) => {
      setMessageErreur(null);
      setMessageSucces(null);
      void adopter({ generationId, scenarioId });
    },
    [adopter],
  );

  const gererSelectionScenario = useCallback((scenarioId: string) => {
    setMessageErreur(null);
    setMessageSucces(null);
    setScenariosSelectionnes((prec) => {
      if (prec.includes(scenarioId)) {
        return prec.filter((id) => id !== scenarioId);
      }
      if (prec.length >= 4) {
        return prec;
      }
      return [...prec, scenarioId];
    });
  }, []);

  const scenariosSelectionnesObjets = tousLesScenarios.filter((s) =>
    scenariosSelectionnes.includes(s.id),
  );

  if (sallesChargement || enseignantsChargement || generationsChargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (
    sallesErreur ||
    enseignantsErreur ||
    generationsErreur ||
    scenariosErreur
  ) {
    return (
      <EtatVide
        titre={t('erreur')}
        message={
          scenariosErreur?.message ??
          generationsErreur?.message ??
          'Une erreur est survenue lors du chargement.'
        }
      />
    );
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

  if (tousLesScenarios.length === 0) {
    return (
      <div style={{ padding: 'var(--space-l)' }}>
        <h1>{t('titre')}</h1>
        <EtatVide titre={t('vide')} message={t('aucunScenario')} />
      </div>
    );
  }

  const colonnes = [
    { cle: 'id', libelle: 'Scénario', triable: false },
    { cle: 'generation', libelle: t('generation'), triable: false },
    { cle: 'statut', libelle: t('statut'), triable: false },
    { cle: 'scoreGlobal', libelle: t('scoreGlobal'), triable: false },
    { cle: 'scoreQualite', libelle: t('scoreQualite'), triable: false },
    { cle: 'scoreEquilibrage', libelle: t('scoreEquilibrage'), triable: false },
    { cle: 'seancesPlacees', libelle: t('seancesPlacees'), triable: false },
    {
      cle: 'seancesNonPlacees',
      libelle: t('seancesNonPlacees'),
      triable: false,
    },
  ];

  const lignes = tousLesScenarios.map((s) => ({
    id: s.id,
    generation: `${s.generationId.slice(0, 8)}…`,
    statut: LIBELLE_STATUT(s.generationStatut),
    scoreGlobal: s.scoreGlobal,
    scoreQualite: s.scoreQualite,
    scoreEquilibrage: s.scoreEquilibrage,
    seancesPlacees: s.placements?.length ?? 0,
    seancesNonPlacees: s.nbNonPlaceesEstimees,
    _scenario: s,
  }));

  const peutComparer = scenariosSelectionnesObjets.length >= 2;

  return (
    <div style={{ padding: 'var(--space-l)' }}>
      {messageSucces && (
        <Alerte
          variante="succès"
          titre={t('alerte.succes') ?? 'Succès'}
          message={messageSucces}
          fermable
          onFermer={() => setMessageSucces(null)}
        />
      )}
      {messageErreur && (
        <Alerte
          variante="erreur"
          titre={t('alerte.erreur') ?? 'Erreur'}
          message={messageErreur}
          fermable
          onFermer={() => setMessageErreur(null)}
        />
      )}

      <h1>{t('titre')}</h1>
      <p>{t('sousTitre')}</p>

      <section style={{ marginBottom: 'var(--space-l)' }}>
        <SelecteurVersion
          versionIdSelectionnee={versionId ?? undefined}
          surSelection={(id) => {
            setVersionId(id);
            setScenariosSelectionnes([]);
            setMessageSucces(null);
            setMessageErreur(null);
          }}
        />
      </section>

      <section>
        <h2
          style={{
            fontSize: 'var(--font-size-h3)',
            marginBottom: 'var(--space-s)',
          }}
        >
          Scénarios disponibles
        </h2>
        <DataTable
          colonnes={colonnes as readonly {
            readonly cle: string;
            readonly libelle: string;
            readonly triable?: boolean;
          }[]}
          donnees={lignes}
          etat="succès"
          libelleVide={t('vide')}
          actions={(ligne) => {
            const s = ligne._scenario as ScenarioAvecMetadonnees;
            const estSelectionne = scenariosSelectionnes.includes(s.id);
            const estAdoptee = s.selectionne;
            return (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-xs)',
                  alignItems: 'flex-start',
                }}
              >
                <label
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  title={
                    peutComparer ||
                    scenariosSelectionnesObjets.length < 4
                      ? 'Ajouter à la comparaison'
                      : 'Maximum 4 scénarios pour la comparaison'
                  }
                >
                  <input
                    type="checkbox"
                    checked={estSelectionne}
                    onChange={() => gererSelectionScenario(s.id)}
                    disabled={
                      !peutComparer &&
                      !estSelectionne &&
                      scenariosSelectionnesObjets.length >= 4
                    }
                    aria-label={
                      `Sélectionner le scénario ${s.id.slice(0, 8)} pour la comparaison`
                    }
                  />
                  {estSelectionne ? 'Comparer' : 'Comparer'}
                </label>
                <button
                  type="button"
                  onClick={() => void gererAdoption(s.generationId, s.id)}
                  disabled={adoptionEnCours || estAdoptee}
                  style={{
                    fontSize: 'var(--font-size-caption)',
                    padding: 'var(--space-xs) var(--space-s)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: estAdoptee
                      ? 'var(--color-surface-variant)'
                      : 'var(--color-primary)',
                    color: estAdoptee
                      ? 'var(--color-text-secondary)'
                      : 'var(--color-surface)',
                    cursor: estAdoptee || adoptionEnCours
                      ? 'not-allowed'
                      : 'pointer',
                  }}
                >
                  {estAdoptee ? 'Adopté' : t('adopter')}
                </button>
                {s.nbNonPlaceesEstimees > 0 && (
                  <span
                    style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--color-text-warning)',
                    }}
                  >
                    {t('nonPlaceesEstimees').replace(
                      '{count, number}',
                      String(s.nbNonPlaceesEstimees),
                    )}
                  </span>
                )}
              </div>
            );
          }}
        />
      </section>

      {peutComparer && scenariosSelectionnesObjets.length > 0 && (
        <section style={{ marginTop: 'var(--space-l)' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-h3)',
              marginBottom: 'var(--space-s)',
            }}
          >
            {t('comparateur.titre')}
          </h2>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-m)',
            }}
          >
            {scenariosSelectionnesObjets.length} scénario(s) sélectionné(s).
          </p>
          <ComparateurScenarios
            scenarios={scenariosSelectionnesObjets}
            salles={salles}
            enseignants={enseignants}
            salleMap={new Map(salles.map((s) => [s.id, s]))}
            enseignantMap={new Map(
              enseignants.map((e) => [e.id, e]),
            )}
          />
        </section>
      )}

      <nav style={{ marginTop: 'var(--space-l)' }}>
        <button
          type="button"
          onClick={() => navigate('/ges/generate')}
          style={{
            fontSize: 'var(--font-size-body)',
            padding: 'var(--space-s) var(--space-m)',
            border: `var(--border-width) solid var(--color-border)`,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Retour à la génération de scénarios
        </button>
      </nav>
    </div>
  );
}

export default ScenarioComparisonPage;