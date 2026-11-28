// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useMemo, useState, type JSX } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SelecteurVersion } from '@/pages/SelecteurVersion';
import { DataTable } from '@/components/molecules/DataTable/DataTable';
import { Alerte } from '@/components/atoms/Alerte';
import { EtatVide } from '@/components/molecules/EtatVide';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { generationApi } from '@/lib/generation.api';
import { type GenerationItem, type Scenario } from '@takt/contracts';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { Bouton } from '@/components/atoms/Bouton';

const DICO = DICTIONNAIRE_FR.dir as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

const LIBELLE_STATUT = (statut: string): string => {
  switch (statut) {
    case 'EN_COURS':
      return t('statutEnCours');
    case 'TERMINEE':
      return t('statutTerminee');
    case 'ECHEC':
      return t('statutEchec');
    case 'ANNULEE':
      return t('statutAnnulee');
    default:
      return statut;
  }
};

interface GenerationAvecScenarios extends GenerationItem {
  scenarios: Scenario[];
}

interface LigneScenario {
  id: string;
  generation: string;
  statut: string;
  scoreGlobal: number;
  scoreQualite: number;
  scoreEquilibrage: number;
  seancesPlacees: number;
  seancesNonPlacees: number;
  generationId: string;
  _scenario: Scenario;
}
function EC_DIR_01(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versionIdDepuisUrl = searchParams.get('versionId') ?? undefined;

  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );
  const [messageSucces, setMessageSucces] = useState<string | null>(null);
  const [messageErreur, setMessageErreur] = useState<string | null>(null);

  const {
    data: generationsData,
    isLoading: generationsChargement,
    error: generationsErreur,
    refetch: refetchGenerations,
  } = useQuery({
    queryKey: ['dir', 'generations', versionId],
    queryFn: () => generationApi.lister(versionId ?? ''),
    enabled: !!versionId,
    retry: 2,
  });

  const generations = (generationsData?.items ?? []) as GenerationItem[];
  const generationIds = generations.map((g) => g.id);

  const {
    data: scenariosParGeneration,
    error: scenariosErreur,
  } = useQuery({
    queryKey: ['dir', 'scenarios', ...generationIds],
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

  const toutesLesGenerations = useMemo<GenerationAvecScenarios[]>(() => {
    const liste: GenerationAvecScenarios[] = [];
    for (const pg of scenariosParGeneration ?? []) {
      const generation = generations.find((g) => g.id === pg.generationId);
      if (generation) {
        liste.push({ ...generation, scenarios: pg.scenarios });
      }
    }
    return liste;
  }, [scenariosParGeneration, generations]);

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

  if (generationsChargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (generationsErreur || scenariosErreur) {
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
        <h1 style={{ fontSize: 'var(--font-size-h1)', marginBottom: 'var(--space-s)' }}>
          {t('titre')}
        </h1>
        <p>{t('sousTitre')}</p>
        <p>{t('selectionnerVersion')}</p>
      </div>
    );
  }

  const lignes = useMemo<LigneScenario[]>(() => {
    const liste: LigneScenario[] = [];
    for (const g of toutesLesGenerations) {
      for (const s of g.scenarios) {
        const sousScores = s.sousScores as
          | { coverage?: number; continuity?: number }
          | undefined;
        const couverture =
          typeof sousScores?.coverage === 'number' ? sousScores.coverage : 0;
        const nbNonPlaceesEstimées =
          Math.max(0, Math.round((100 - couverture) / 100) * 10) ||
          s.placements?.length > 0
            ? 0
            : 0;
        liste.push({
          id: s.id,
          generation: `${g.id.slice(0, 8)}…`,
          statut: LIBELLE_STATUT(g.statut ?? 'INCONNUE'),
          scoreGlobal: s.scoreGlobal,
          scoreQualite: sousScores?.coverage ?? 0,
          scoreEquilibrage: sousScores?.continuity ?? 0,
          seancesPlacees: s.placements?.length ?? 0,
          seancesNonPlacees: nbNonPlaceesEstimées,
          generationId: g.id,
          _scenario: s,
        });
      }
    }
    return liste;
  }, [toutesLesGenerations]);


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

      {lignes.length === 0 && (
        <EtatVide titre={t('vide')} message={t('aucunScenario')} />
      )}

      {lignes.length > 0 && (
        <section>
          <h2
            style={{
              fontSize: 'var(--font-size-h3)',
              marginBottom: 'var(--space-s)',
              color: 'var(--color-text-primary)',
            }}
          >
            {t('scenariosDisponibles')}
          </h2>
          <DataTable
            colonnes={[
              { cle: 'id', libelle: t('colonneScenario'), triable: false },
              { cle: 'generation', libelle: t('colonneGeneration'), triable: false },
              { cle: 'statut', libelle: t('colonneStatut'), triable: false },
              { cle: 'scoreGlobal', libelle: t('colonneScoreGlobal'), triable: false },
              { cle: 'scoreQualite', libelle: t('colonneScoreQualite'), triable: false },
              { cle: 'scoreEquilibrage', libelle: t('colonneScoreEquilibrage'), triable: false },
              { cle: 'seancesPlacees', libelle: t('colonneSeancesPlacees'), triable: false },
              {
                cle: 'seancesNonPlacees',
                libelle: t('colonneSeancesNonPlacees'),
                triable: false,
              },
            ]}
            donnees={lignes}
            etat="succès"
            libelleVide={t('vide')}
            actions={(ligne) => {
              const estAdoptee = ligne._scenario.selectionne;
              return (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                    alignItems: 'flex-start',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void gererAdoption(ligne.generationId, ligne.id)
                    }
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
                    {estAdoptee ? t('scenarioAdopte') : t('boutonAdopter')}
                  </button>
                  {ligne.seancesNonPlacees > 0 && (
                    <span
                      style={{
                        fontSize: 'var(--font-size-caption)',
                        color: 'var(--color-text-attention)',
                      }}
                    >
                      {t('nonPlaceesEstimees').replace(
                        '{count, number}',
                        String(ligne.seancesNonPlacees),
                      )}
                    </span>
                  )}
                </div>
              );
            }}
          />
        </section>
      )}

      <nav style={{ marginTop: 'var(--space-l)' }}>
        <Bouton
          variante="contour"
          taille="moyenne"
          onClick={() => navigate('/dir/decision')}
          libelle={t('boutonValidation')}
        />
      </nav>
    </div>
  );
}

export default EC_DIR_01;

