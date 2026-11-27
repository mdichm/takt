// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { versionStore } from '@/stores/versionStore';
import { repartitionApi } from '@/lib/repartition.api';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { StatutValidationRepartition } from '@takt/contracts';

interface DonneesPage {
  statuts: StatutValidationRepartition[];
}

function EC_RDEP_04(): JSX.Element {
  const dictBouton = traduction('bouton') as (typeof DICTIONNAIRE_FR)['bouton'];
  const dictRdep = traduction('rdep') as (typeof DICTIONNAIRE_FR)['rdep'];
  const { contexteRepartition } = versionStore((state) => ({
    contexteRepartition: state.contexteRepartition,
  }));
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    versionId = '',
    semestreId = '',
    departementId = '',
    etatVersion = '',
  } = contexteRepartition ?? {};

  const estRevalidationRequise = (s: StatutValidationRepartition) =>
    s.etat === 'REVALIDATION_REQUISE';

  const {
    data: donneesPage,
    isLoading: chargementDonnees,
    error: erreurDonnees,
    refetch: refetchDonnees,
  } = useQuery<DonneesPage, Error>({
    queryKey: ['rdep', 'revalidation', versionId],
    queryFn: async () => {
      const statuts = await repartitionApi.listerStatutsValidation(versionId);
      return { statuts } as DonneesPage;
    },
    enabled: !!versionId,
    staleTime: 2 * 60 * 1000,
  });

  const statuts = donneesPage?.statuts ?? [];
  const statutDepartement = statuts.find((s) => s.departementId === departementId);
  const requise = statutDepartement ? estRevalidationRequise(statutDepartement) : false;
  const motifDirection = statutDepartement?.motif ?? null;

  const { mutateAsync: revalider, isPending: chargementRevalidation } =
    useMutation({
      mutationFn: () =>
        repartitionApi.revaliderDepartement({
          versionId,
          departementId,
        }),
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['rdep', 'revalidation', versionId],
        });
        navigate('/dashboard');
      },
      onError: (erreur: Error) => {
        alert(erreur.message || dictRdep.echecTransition);
      },
    });

  const gererRevalider = useCallback(async () => {
    if (!requise) return;
    await revalider();
  }, [requise, revalider]);
  if (chargementDonnees) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <span role="status" aria-label="Chargement" style={{ width: '20px', height: '20px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>Chargement de la revalidation…</span>
      </section>
    );
  }

  if (erreurDonnees) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <Alerte variante="erreur" titre="Erreur" message={erreurDonnees.message} />
        <Bouton variante="secondaire" onClick={refetchDonnees} libelle={dictBouton.confirmer} />
      </section>
    );
  }

  if (!contexteRepartition) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <Alerte variante="erreur" titre={dictRdep.contexteManquant} message={dictRdep.contexteManquantDetaille} />
      </section>
    );
  }
  return (
    <section data-testid="ec-rdep-04" style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-s)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            {dictRdep.titreRevalidation} — {departementId}
          </h1>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 'var(--space-xxs) 0 0 0' }}>
            Version {versionId} · Semestre {semestreId} · État : {etatVersion}
          </p>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }} aria-label="Fil d'Ariane">
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>Tableau de bord</span>
          <span style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-primary)' }}>Revalidation ciblée</span>
        </nav>
      </header>

      {requise && motifDirection && (
        <div style={{ padding: 'var(--space-m)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-variant)' }}>
          <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, margin: '0 0 var(--space-s) 0', color: 'var(--color-text-primary)' }}>
            {dictRdep.revalidationDemandeeParDirection}
          </h3>
          <div style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)', marginBottom: 'var(--space-s)' }}>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {dictRdep.motifRejetDirection}
            </span>
            <span style={{ display: 'block', marginTop: 'var(--space-xxs)' }}>{motifDirection}</span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xxs)', padding: 'var(--space-xxs) var(--space-s)', border: 'var(--border-width) solid var(--color-divider)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            {dictRdep.badgeLectureSeule}
          </span>
        </div>
      )}

      {!requise && (
        <Alerte variante="info" titre="Aucune revalidation requise" message="Votre département n'est pas marqué comme nécessitant une revalidation." fermable={false} />
      )}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Action</h2>
        <div style={{ display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
          <Bouton
            variante="primaire"
            taille="moyenne"
            disabled={!requise || chargementRevalidation}
            chargement={chargementRevalidation}
            onClick={gererRevalider}
            libelle={dictRdep.boutonRevaliderPerimetre}
          />
          {!requise && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xxs)' }}>
              Aucune séance à revalider pour votre périmètre.
            </span>
          )}
          <Bouton
            variante="contour"
            taille="moyenne"
            onClick={() => navigate('/dashboard')}
            libelle={dictBouton.annuler}
          />
        </div>
      </section>
    </section>
  );
}

export default EC_RDEP_04;
