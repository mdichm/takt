// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { versionStore } from '@/stores/versionStore';
import { repartitionApi } from '@/lib/repartition.api';
import { versionsApi } from '@/lib/versions.api';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { Input } from '@/components/atoms/Input';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { StatutValidationRepartition } from '@takt/contracts';

interface DonneesPage {
  statuts: StatutValidationRepartition[];
}

function EC_RDEP_03(): JSX.Element {
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

  const peutValider = etatVersion === 'valid_pedag';
  const [motifRejet, setMotifRejet] = useState('');

  const {
    data: donneesPage,
    isLoading: chargementDonnees,
    error: erreurDonnees,
    refetch: refetchDonnees,
  } = useQuery<DonneesPage, Error>({
    queryKey: ['rdep', 'validation', versionId],
    queryFn: async () => {
      const statuts = await repartitionApi.listerStatutsValidation(versionId);
      return { statuts } as DonneesPage;
    },
    enabled: !!versionId,
    staleTime: 2 * 60 * 1000,
  });

  const statuts = donneesPage?.statuts ?? [];
  const statutDepartement = statuts.find((s) => s.departementId === departementId);
  const estValide = statutDepartement?.etat === 'VALIDE';
  const blocageValidation = !peutValider || !estValide || chargementDonnees;
  const motifBlocage = useCallback(() => {
    if (!peutValider) return dictRdep.validationNonDisponibleEtat;
    if (!estValide) return 'La répartition de votre département doit être validée avant transmission.';
    return '';
  }, [peutValider, estValide, dictRdep]);

  const { mutateAsync: transitionner, isPending: chargementTransition } =
    useMutation({
      mutationFn: (action: 'transmettreDirection' | 'rejeterPedagogique') => {
        if (action === 'rejeterPedagogique') {
          return versionsApi.transitionner(versionId, {
            action: 'rejeterPedagogique',
            motif: motifRejet,
            typeMotif: 'pedagogique',
          });
        }
        return versionsApi.transitionner(versionId, {
          action: 'transmettreDirection',
        });
      },
      onSuccess: async (_resultat, action) => {
        await queryClient.invalidateQueries({
          queryKey: ['rdep', 'validation', versionId],
        });
        if (action === 'transmettreDirection') {
          navigate('/dashboard');
        } else {
          navigate('/ges/edt');
        }
      },
      onError: (erreur: Error) => {
        alert(erreur.message || dictRdep.echecTransition);
      },
    });

  const gererValider = useCallback(async () => {
    if (blocageValidation) return;
    await transitionner('transmettreDirection');
  }, [blocageValidation, transitionner]);

  const gererRejeter = useCallback(async () => {
    if (!motifRejet.trim()) return;
    await transitionner('rejeterPedagogique');
  }, [motifRejet, transitionner]);
  if (chargementDonnees) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <span role="status" aria-label="Chargement" style={{ width: '20px', height: '20px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>Chargement de la validation…</span>
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
    <section data-testid="ec-rdep-03" style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-s)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            {dictRdep.titreValidation} — {departementId}
          </h1>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 'var(--space-xxs) 0 0 0' }}>
            Version {versionId} · Semestre {semestreId} · État : {etatVersion}
          </p>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }} aria-label="Fil d'Ariane">
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>Tableau de bord</span>
          <span style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-primary)' }}>Validation du périmètre</span>
        </nav>
      </header>

      <div style={{ padding: 'var(--space-m)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-variant)' }}>
        <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, margin: '0 0 var(--space-s) 0', color: 'var(--color-text-primary)' }}>État de votre département</h3>
        <div style={{ display: 'flex', gap: 'var(--space-m)', alignItems: 'start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Validation départementale</span>
            <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginTop: 'var(--space-xs)' }}>{estValide ? dictRdep.validee : (statutDepartement?.etat ?? dictRdep.aucunStatut)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>État de la version</span>
            <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginTop: 'var(--space-xs)' }}>{etatVersion}</span>
          </div>
        </div>
        {!estValide && (
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xxs)' }}>La validation de votre département est requise avant transmission à la Direction.</span>
        )}
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2 style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Actions de workflow</h2>
        <div style={{ display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
          <Bouton variante="primaire" taille="moyenne" disabled={blocageValidation || chargementTransition} chargement={chargementTransition} onClick={gererValider} libelle={dictRdep.boutonValiderTransmettre} />
          {blocageValidation && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xxs)' }}>{motifBlocage()}</span>
          )}
        </div>

        <div style={{ padding: 'var(--space-m)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Rejeter la version</h3>
          <p style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-s) 0' }}>Retour de la version à l'état « édition ». La Direction sera informée du motif.</p>
          <Input label={dictRdep.champMotifRejet} placeholder={dictRdep.champMotifRejet} value={motifRejet} onChange={(valeur) => setMotifRejet(valeur)} />
          {motifRejet.trim().length === 0 && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-error)' }}>{dictRdep.motifObligatoire}</span>
          )}
          <Bouton variante="danger" taille="moyenne" disabled={!motifRejet.trim() || chargementTransition || !peutValider} chargement={chargementTransition} onClick={gererRejeter} libelle={dictRdep.boutonRejeter} />
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Bouton variante="contour" taille="moyenne" onClick={() => navigate('/dashboard')} libelle={dictBouton.annuler} />
      </div>
    </section>
  );
}

export default EC_RDEP_03;
