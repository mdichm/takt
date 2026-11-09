// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versionStore } from '@/stores/versionStore';
import { repartitionApi } from '@/lib/repartition.api';
import { calculerCharge, construireAffectationsCharge, calculerTauxCouverture, CHARGE_RULE_SET_DEFAUT } from '@/lib/calculsCharge';
import type { ChargeEnseignant, AlerteCharge } from '@takt/charge-engine';
import { Bouton } from '@/components/atoms/Bouton';
import { Badge } from '@/components/atoms/Badge';
import { Alerte } from '@/components/atoms/Alerte';
import { Icone } from '@/components/atoms/Icone';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { AffectationPedagogique, PlanEtudesMatiere, StatutValidationRepartition } from '@takt/contracts';

interface DonneesPage {
  affectations: AffectationPedagogique[];
  matieresPlan: PlanEtudesMatiere[];
  statuts: StatutValidationRepartition[];
}

function EC_RDEP_02(): JSX.Element {
  const dictBouton = traduction('bouton') as (typeof DICTIONNAIRE_FR)['bouton'];
  const { contexteRepartition } = versionStore((state) => ({
    contexteRepartition: state.contexteRepartition,
  }));
  const queryClient = useQueryClient();

  const [messageSucces, setMessageSucces] = useState<string | undefined>();
  const [messageErreur, setMessageErreur] = useState<string | undefined>();
  const [annulerDemande, setAnnulerDemande] = useState(false);

  if (!contexteRepartition) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <Alerte variante="erreur" titre="Contexte manquant" message="Aucun contexte de répartition n'est défini. Veuillez sélectionner une version et un département." />
      </section>
    );
  }

  const { versionId, semestreId, departementId, etatVersion } = contexteRepartition;
  const peutValider = etatVersion === 'rep_pedag';

  const {
    data: donneesPage,
    isLoading: chargementDonnees,
    error: erreurDonnees,
    refetch: refetchDonnees,
  } = useQuery<DonneesPage, Error>({
    queryKey: ['rdep', 'charges', versionId, departementId],
    queryFn: async () => {
      const [affectations, matieresPlan, statuts] = await Promise.all([
        repartitionApi.listerAffectations(versionId, departementId),
        repartitionApi.listerMatieresPlanEtudes(''),
        repartitionApi.listerStatutsValidation(versionId),
      ]);
      return {
        affectations: affectations.items,
        matieresPlan: matieresPlan.items,
        statuts,
      } as DonneesPage;
    },
    enabled: !!versionId && !!departementId,
    staleTime: 2 * 60 * 1000,
  });

  const affectations = donneesPage?.affectations ?? [];
  const matieresPlan = donneesPage?.matieresPlan ?? [];
  const statuts = donneesPage?.statuts ?? [];

  const affectationsCharge = useMemo(
    () => construireAffectationsCharge(affectations),
    [affectations],
  );

  const resultatCharge = useMemo(
    () => calculerCharge(affectationsCharge, CHARGE_RULE_SET_DEFAUT),
    [affectationsCharge],
  );

  const tauxCouverture = useMemo(
    () => calculerTauxCouverture(departementId, matieresPlan, affectations),
    [departementId, matieresPlan, affectations],
  );

  const statutDepartement = statuts.find((s) => s.departementId === departementId);
  const estValide = statutDepartement?.etat === 'VALIDE';

  const { mutateAsync: validerRepartition, isPending: chargementValidation } = useMutation({
    mutationFn: () =>
      repartitionApi.validerRepartition({ versionId, departementId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdep', 'charges', versionId, departementId] });
      setMessageSucces('Répartition validée avec succès.');
      setMessageErreur(undefined);
    },
    onError: (erreur: Error) => {
      setMessageErreur(erreur.message || 'Échec de la validation.');
      setMessageSucces(undefined);
    },
  });

  const { mutateAsync: annulerRepartition, isPending: chargementAnnulation } = useMutation({
    mutationFn: () =>
      repartitionApi.annulerRepartition({ versionId, departementId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdep', 'charges', versionId, departementId] });
      setMessageSucces('Répartition annulée (retour à initial).');
      setAnnulerDemande(false);
      setMessageErreur(undefined);
    },
    onError: (erreur: Error) => {
      setMessageErreur(erreur.message || 'Échec de l’annulation.');
      setAnnulerDemande(false);
      setMessageSucces(undefined);
    },
  });
  const gererValider = useCallback(async () => {
    if (!peutValider) return;
    await validerRepartition();
  }, [peutValider, validerRepartition]);

  const gererAnnuler = useCallback(async () => {
    setAnnulerDemande(true);
    await annulerRepartition();
  }, [annulerRepartition]);

  const hasBloquant = resultatCharge.alertes.some(
    (a: AlerteCharge) => a.severite === 'BLOQUANT',
  );
  const blocageValidation = !peutValider || hasBloquant;
  if (chargementDonnees) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <span role="status" aria-label="Chargement" style={{ width: '20px', height: '20px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>Chargement du suivi…</span>
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
  return (
    <section
      data-testid="ec-rdep-02"
      style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}
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
            Suivi des charges — {departementId}
          </h1>
          <p
            style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--color-text-secondary)',
              margin: 'var(--space-xxs) 0 0 0',
            }}
          >
            Version {versionId} · Semestre {semestreId} · État : {etatVersion}
          </p>
        </div>
        <nav
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }}
          aria-label="Fil d'Ariane"
        >
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>Tableau de bord</span>
          <Icone nom="chevron-bas" taille={14} ariaLabel="Séparateur" />
          <span style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-primary)' }}>Suivi des charges</span>
        </nav>
      </header>

      {messageSucces && (
        <Alerte variante="succès" titre="Succès" message={messageSucces} fermable={true} onFermer={() => setMessageSucces(undefined)} />
      )}
      {messageErreur && (
        <Alerte variante="erreur" titre="Erreur" message={messageErreur} fermable={true} onFermer={() => setMessageErreur(undefined)} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-m)' }}>
        <div style={{ padding: 'var(--space-m)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Taux de couverture</span>
          <span style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginTop: 'var(--space-xs)' }}>
            {tauxCouverture.taux.toFixed(0)}%
          </span>
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
            {tauxCouverture.volumeAffecte} h / {tauxCouverture.volumePrevu} h
          </span>
          <Badge
            variante={tauxCouverture.complet ? 'succès' : 'attention'}
            libelle={tauxCouverture.complet ? 'Couvré' : 'Incomplet'}
          />
        </div>
        <div style={{ padding: 'var(--space-m)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enseignants</span>
          <span style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginTop: 'var(--space-xs)' }}>
            {resultatCharge.parEnseignant.length}
          </span>
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
            {resultatCharge.tauxDepassement.toFixed(1)} % en dépassement
          </span>
        </div>
        <div style={{ padding: 'var(--space-m)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Validation département</span>
          <span style={{ fontSize: 'var(--font-size-h2)', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginTop: 'var(--space-xs)' }}>
            {estValide ? 'Validée' : 'En cours'}
          </span>
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
            {statutDepartement?.etat ?? 'Aucun statut'}
          </span>
        </div>
      </div>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--color-text-primary)',
          }}
        >
          Charge par enseignant
        </h2>
        {resultatCharge.parEnseignant.length === 0 && (
          <Alerte variante="info" titre="Aucune donnée" message="Aucune affectation saisie pour ce département." />
        )}
        {resultatCharge.parEnseignant.map(
          (charge: ChargeEnseignant) => (
          <div
            key={charge.enseignantId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-s)',
              padding: 'var(--space-s)',
              border: `var(--border-width) solid var(--color-divider)`,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {charge.enseignantId}
              </span>
              <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginLeft: 'var(--space-xs)' }}>
                {charge.chargeArrondie} h / {charge.cible} h ({charge.taux.toFixed(0)} %)
              </span>
            </div>
            <Badge
              variante={charge.statut === 'BLOQUANT' ? 'erreur' : charge.statut === 'AVERTISSEMENT' ? 'attention' : 'succès'}
              libelle={charge.statut === 'BLOQUANT' ? 'Bloquant' : charge.statut === 'AVERTISSEMENT' ? 'Attention' : 'Conforme'}
            />
          </div>
        ))}
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--color-text-primary)',
          }}
        >
          Actions de workflow
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap' }}>
          <Bouton
            variante="primaire"
            taille="moyenne"
            disabled={blocageValidation || estValide || chargementValidation}
            chargement={chargementValidation}
            onClick={gererValider}
            libelle={dictBouton.confirmer}
          />
          {blocageValidation && !estValide && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
              {hasBloquant ? 'Alerte bloquante : validation interdite.' : ''}
            </span>
          )}
          <Bouton
            variante="danger"
            taille="moyenne"
            disabled={true}
            chargement={chargementAnnulation}
            onClick={gererAnnuler}
            libelle="Annuler la répartition"
          />
          {annulerDemande && (
            <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
              Annulation indisponible : endpoint backend en cours de livraison (TAKT-L05-04).
            </span>
          )}
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Bouton
          variante="contour"
          taille="moyenne"
          onClick={refetchDonnees}
          libelle="Actualiser"
        />
      </div>
    </section>
  );
}

export default EC_RDEP_02;
