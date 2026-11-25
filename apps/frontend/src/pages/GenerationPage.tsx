// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EtatChargement } from '../components/molecules/EtatChargement';
import { BarreProgression } from '../components/molecules/BarreProgression';
import { EtatErreur } from '../components/molecules/EtatErreur';
import { DataTable } from '../components/molecules/DataTable/DataTable';
import { useCanalEvenements } from '../app/useCanalEvenements';
import { useEtatReseau } from '../app/useEtatReseau';
import { generationApi } from '../lib/generation.api';
import { zGenerationStatut } from '@takt/contracts';

const FormSchema = z.object({
  versionId: z.string().uuid(),
});

type GenerationStatut = z.infer<typeof zGenerationStatut>;

export function GenerationPage(): JSX.Element {
  const { versionId } = useParams<{ versionId: string }>();
  const { evenementsGeneration } = useCanalEvenements();
  const { estEnLigne } = useEtatReseau();

  const [lancementErreur, setLancementErreur] = useState<string | null>(null);
  const [statutGeneration, setStatutGeneration] = useState<GenerationStatut | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { versionId: versionId ?? '' },
  });

  const { data: preconditions, isLoading: verifChargement, refetch: verifier } =
    useQuery({
      queryKey: ['generation-preconditions', versionId],
      queryFn: () => generationApi.verifierPreconditions(versionId ?? ''),
      enabled: !!versionId && estEnLigne,
      retry: 2,
    });

  const { mutate: lancer, isPending: lancementEnCours, error: lancerErreur } = useMutation({
    mutationFn: (id: string) => generationApi.lancer(id),
    onSuccess: () => {
      setLancementErreur(null);
      void verifier();
    },
    onError: (err: unknown) => {
      setLancementErreur(
        err instanceof Error ? err.message : 'Echec du lancement de la generation.',
      );
    },
  });

  const { data: liste, isLoading: listeChargement, refetch: rafraichirListe } =
    useQuery({
      queryKey: ['generations', versionId],
      queryFn: () => generationApi.lister(versionId ?? ''),
      enabled: !!versionId && estEnLigne,
      refetchInterval: (data) => {
        const statut = statutGeneration ?? null;
        return statut === 'EN_COURS' ? 3000 : false;
      },
    });

  const { mutate: annuler } = useMutation({
    mutationFn: (id: string) => generationApi.annuler(id),
    onSuccess: () => {
      setStatutGeneration(null);
      void rafraichirListe();
    },
  });

  const situationsGeneration = evenementsGeneration ?? [];
  const dernierEvenement = situationsGeneration[situationsGeneration.length - 1] ?? null;

  const progression = dernierEvenement?.progression ?? 0;
  const messageProgression = dernierEvenement?.message ?? '';

  useEffect(() => {
    const statutRecu = dernierEvenement?.type;
    if (
      statutRecu === 'generation.done' ||
      statutRecu === 'generation.failed' ||
      statutRecu === 'generation.cancelled'
    ) {
      setStatutGeneration(
        statutRecu === 'generation.done'
          ? 'TERMINEE'
          : statutRecu === 'generation.failed'
            ? 'ECHEC'
            : 'ANNULEE',
      );
    }
  }, [dernierEvenement]);

  useEffect(() => {
    if (liste?.items.length && statutGeneration === null) {
      const dernier = liste.items[liste.items.length - 1];
      if (dernier) {
        setStatutGeneration(dernier.statut);
      }
    }
  }, [liste]);

  const preconditionsSatisfaites = preconditions?.satisfaites ?? false;
  const violations = preconditions?.violations ?? [];
  const avertissements = preconditions?.avertissements ?? [];

  const peutLancer = preconditionsSatisfaites && !lancementEnCours;

  const colonnes = [
    { cle: 'id', libelle: 'ID generation' },
    { cle: 'statut', libelle: 'Statut' },
    { cle: 'nombreScenarios', libelle: 'Scenarios' },
    { cle: 'dureeMs', libelle: 'Duree (ms)' },
    { cle: 'createdAt', libelle: 'Cree le' },
  ];

  const lignes = (liste?.items ?? []).map((g) => ({
    id: g.id,
    statut: g.statut,
    nombreScenarios: g.nombreScenarios ?? 0,
    dureeMs: g.dureeMs ?? '-',
    createdAt: g.createdAt,
  }));
  return (
    <div style={{ padding: 'var(--space-l)' }}>
      <h1>Generation de scenarios</h1>
      <p>
        Creez des scenarios de planning pour la version selectionnee. Le suivi de progression se
        fait en temps reel via le canal d'evenements.
      </p>

      {verifChargement && <EtatChargement libelle="Verification des preconditions…" />}

      {!verifChargement && (
        <>
          <section style={{ marginBottom: 'var(--space-l)' }}>
            <h2>Preconditions</h2>
            <ul>
              {violations.map((v, i) => (
                <li key={i} style={{ color: 'var(--color-error)' }}>
                  {String(v)}
                </li>
              ))}
              {avertissements.map((a, i) => (
                <li key={i} style={{ color: 'var(--color-warning)' }}>
                  {String(a)}
                </li>
              ))}
              {!violations.length && !avertissements.length && (
                <li>Toutes les preconditions sont satisfaites.</li>
              )}
            </ul>
          </section>

          <section style={{ marginBottom: 'var(--space-l)' }}>
            <h2>Lancement</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const valeurs = form.getValues();
                void lancer(valeurs.versionId);
              }}
            >
              {peutLancer && (
                <button
                  type="button"
                  onClick={() => {
                    setLancementErreur(null);
                    void lancer(versionId ?? '');
                  }}
                  disabled={!peutLancer || !estEnLigne}
                >
                  {lancementEnCours ? 'Lancement en cours…' : 'Lancer la generation'}
                </button>
              )}
              {lancementEnCours && (
                <button
                  type="button"
                  onClick={() => void annuler(versionId ?? '')}
                  disabled={!estEnLigne}
                >
                  Annuler
                </button>
              )}
              {lancementErreur && (
                <span
                  style={{ color: 'var(--color-error)', marginLeft: 'var(--space-s)' }}
                >
                  {lancementErreur}
                </span>
              )}
            </form>
          </section>

          <section style={{ marginBottom: 'var(--space-l)' }}>
            <h2>Suivi de progression</h2>
            {dernierEvenement ? (
              <>
                <BarreProgression
                  valeur={progression}
                  libelle="Generation en cours"
                  message={messageProgression}
                />
                <p>
                  Dernier evenement : {dernierEvenement.type} — {dernierEvenement.message ?? ''}
                </p>
              </>
            ) : (
              <p>Aucune generation en cours.</p>
            )}
          </section>

          <section>
            <h2>Generations</h2>
            <DataTable
              colonnes={colonnes as readonly { readonly cle: string; readonly libelle: string }[]}
              donnees={lignes}
              etat="succès"
              meta={{
                page: liste?.meta.page ?? 1,
                pageSize: liste?.meta.pageSize ?? 10,
                total: liste?.meta.total ?? 0,
              }}
              surChangementPage={() => {}}
            />
          </section>
        </>
      )}

      {listeChargement && <EtatChargement libelle="Chargement des generations…" />}
      {lancementErreur && (
        <EtatErreur message={lancementErreur} onReessayer={verifier} />
      )}
    </div>
  );
}

export default GenerationPage;

