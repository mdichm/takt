// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versionStore } from '@/stores/versionStore';
import {
  repartitionApi,
  type PlanEtudes,
  type Enseignant,
  type Groupe,
  type Matiere,
  type TypeEnseignement,
} from '@/lib/repartition.api';
import { calculerCharge, detecterMatieresManquantes, construireAffectationsCharge, CHARGE_RULE_SET_DEFAUT } from '@/lib/calculsCharge';
import type { ChargeEnseignant, AlerteCharge } from '@takt/charge-engine';
import { AffectationEditor } from '@/components/organisms/AffectationEditor/AffectationEditor';
import { Bouton } from '@/components/atoms/Bouton';
import { Badge } from '@/components/atoms/Badge';
import { Alerte } from '@/components/atoms/Alerte';
import { Icone } from '@/components/atoms/Icone';
import { Input } from '@/components/atoms/Input';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type {
  AffectationPedagogique,
  PlanEtudesMatiere,
  StatutValidationRepartition,
} from '@takt/contracts';

interface DonneesPage {
  affectations: AffectationPedagogique[];
  matieresPlan: PlanEtudesMatiere[];
  planEtudes: PlanEtudes | null;
  enseignants: Enseignant[];
  matieres: Matiere[];
  groupes: Groupe[];
  typesEnseignement: TypeEnseignement[];
  statuts: StatutValidationRepartition[];
}

function EC_RDEP_01(): JSX.Element {
  const dictBouton = traduction('bouton') as (typeof DICTIONNAIRE_FR)['bouton'];
  const dictRdep = traduction('rdep') as (typeof DICTIONNAIRE_FR)['rdep'];
  const { contexteRepartition } = versionStore((state) => ({
    contexteRepartition: state.contexteRepartition,
  }));
  const queryClient = useQueryClient();

  const [affectationSelectionnee, setAffectationSelectionnee] = useState<
    AffectationPedagogique | null
  >(null);
  const [messageSucces, setMessageSucces] = useState<string | undefined>();
  const [recherche, setRecherche] = useState('');

  const {
    versionId = '',
    semestreId = '',
    departementId = '',
    etatVersion = '',
  } = contexteRepartition ?? {};
  const peutValider = etatVersion === 'rep_pedag';

  const {
    data: donneesPage,
    isLoading: chargementDonnees,
    error: erreurDonnees,
    refetch: refetchDonnees,
  } = useQuery<DonneesPage, Error>({
    queryKey: ['rdep', 'allocation', versionId, departementId],
    queryFn: async () => {
      const [plans, affectations, statuts] = await Promise.all([
        repartitionApi.listerPlansEtudes({ departementId, semestreId }),
        repartitionApi.listerAffectations(versionId, departementId),
        repartitionApi.listerStatutsValidation(versionId),
      ]);
      const planEtudes = plans.items.length > 0 ? plans.items[0] : null;
      const matieresPlan = planEtudes
        ? (await repartitionApi.listerMatieresPlanEtudes(planEtudes.id)).items
        : [];
      const [enseignants, groupes, typesEnseignement, matieresRef] =
        await Promise.all([
          repartitionApi.listerEnseignants(),
          repartitionApi.listerGroupes(),
          repartitionApi.listerTypesEnseignement(),
          repartitionApi.listerMatieres(),
        ]);
      return {
        affectations: affectations.items,
        matieresPlan,
        planEtudes,
        enseignants: enseignants.items,
        matieres: matieresRef.items,
        groupes: groupes.items,
        typesEnseignement: typesEnseignement.items,
        statuts,
      } as DonneesPage;
    },
    enabled: !!versionId && !!departementId,
    staleTime: 2 * 60 * 1000,
  });
  const affectations = donneesPage?.affectations ?? [];
  const matieresPlan = donneesPage?.matieresPlan ?? [];
  const enseignants = donneesPage?.enseignants ?? [];
  const matieresRef = donneesPage?.matieres ?? [];
  const groupes = donneesPage?.groupes ?? [];
  const statuts = donneesPage?.statuts ?? [];

  const statutDepartement = statuts.find((s) => s.departementId === departementId);
  const estValide = statutDepartement?.etat === 'VALIDE';
  const valideLe = statutDepartement?.valideLe;
  const estLectureSeule =
    estValide || (etatVersion !== 'initial' && etatVersion !== 'rep_pedag');

  const enseignantNomParId = new Map(
    enseignants.map((e) => [e.id, `${e.prenom} ${e.nom}`]),
  );
  const matiereParId = new Map(matieresRef.map((m) => [m.id, m]));
  const groupeParId = new Map(groupes.map((g) => [g.id, g]));

  const affectationsFiltrees = affectations.filter((aff) => {
    const terme = recherche.toLowerCase();
    const ens = enseignantNomParId.get(aff.enseignantId)?.toLowerCase() ?? '';
    const mat = matiereParId.get(aff.matiereId)?.libelle?.toLowerCase() ?? '';
    return ens.includes(terme) || mat.includes(terme);
  });

  const enseignantsPourEditeur = enseignants.map((e) => ({
    id: e.id,
    code: e.matricule,
    libelle: `${e.prenom} ${e.nom}`,
  }));

  const affectationsCharge = useMemo(
    () => construireAffectationsCharge(affectations),
    [affectations],
  );

  const resultatCharge = useMemo(
    () => calculerCharge(affectationsCharge, CHARGE_RULE_SET_DEFAUT),
    [affectationsCharge],
  );

  const matieresManquantes = useMemo(
    () => detecterMatieresManquantes(matieresPlan, affectations),
    [matieresPlan, affectations],
  );

  const enseignantCourantId = affectationSelectionnee?.enseignantId ?? null;
  const chargeEnseignant = useMemo(() => {
    if (!enseignantCourantId) return null;
    return resultatCharge.parEnseignant.find(
      (c: ChargeEnseignant) => c.enseignantId === enseignantCourantId,
    ) ?? null;
  }, [enseignantCourantId, resultatCharge]);

  const hasBloquant = resultatCharge.alertes.some(
    (a: AlerteCharge) => a.severite === 'BLOQUANT',
  );

  const { mutateAsync: creerAffectation, isPending: chargementCreation } = useMutation({
    mutationFn: (donnees: Parameters<typeof repartitionApi.creerAffectation>[0]) =>
      repartitionApi.creerAffectation(donnees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdep', 'allocation', versionId, departementId] });
      setAffectationSelectionnee(null);
      setMessageSucces(dictRdep.affectationCree);
    },
  });

  const { mutateAsync: mettreAJourAffectation, isPending: chargementModification } = useMutation({
    mutationFn: ({
      id,
      donnees,
    }: { id: string; donnees: Parameters<typeof repartitionApi.mettreAJourAffectation>[1] }) =>
      repartitionApi.mettreAJourAffectation(id, donnees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdep', 'allocation', versionId, departementId] });
      setAffectationSelectionnee(null);
      setMessageSucces(dictRdep.affectationModifiee);
    },
  });

  const { mutateAsync: supprimerAffectation, isPending: chargementSuppression } = useMutation({
    mutationFn: (id: string) => repartitionApi.supprimerAffectation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdep', 'allocation', versionId, departementId] });
      setAffectationSelectionnee(null);
      setMessageSucces(dictRdep.affectationSupprimee);
    },
  });

  const { mutateAsync: validerRepartition, isPending: chargementValidation } = useMutation({
    mutationFn: () =>
      repartitionApi.validerRepartition({ versionId, departementId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rdep', 'allocation', versionId, departementId] });
      setMessageSucces(dictRdep.repartitionValidee);
    },
  });
  const gererNouvelleAffectation = useCallback(() => {
    setAffectationSelectionnee(null);
    setMessageSucces(undefined);
  }, []);

  const gererModifierAffectation = useCallback(
    (affectation: AffectationPedagogique) => {
      setAffectationSelectionnee(affectation);
      setMessageSucces(undefined);
    },
    [],
  );

  const gererSupprimerAffectation = useCallback(
    async (id: string) => {
      if (!window.confirm(dictRdep.confirmerSuppression)) return;
      await supprimerAffectation(id);
    },
    [supprimerAffectation],
  );

  const gererSoumettreAffectation = useCallback(
    async (donnees: {
      enseignantId: string;
      matiereId: string;
      groupeId: string;
      typeEnseignementId?: string | null | undefined;
      volumeHebdo: string;
    }) => {
      if (affectationSelectionnee) {
        await mettreAJourAffectation({
          id: affectationSelectionnee.id,
          donnees: {
            id: affectationSelectionnee.id,
            versionId,
            enseignantId: donnees.enseignantId,
            matiereId: donnees.matiereId,
            groupeId: donnees.groupeId,
            typeEnseignementId: donnees.typeEnseignementId ?? undefined,
            volumeHebdo: Number(donnees.volumeHebdo),
          },
        });
      } else {
        await creerAffectation({
          versionId,
          semestreId,
          enseignantId: donnees.enseignantId,
          matiereId: donnees.matiereId,
          groupeId: donnees.groupeId,
          typeEnseignementId: donnees.typeEnseignementId ?? undefined,
          volumeHebdo: Number(donnees.volumeHebdo),
        });
      }
    },
    [affectationSelectionnee, versionId, semestreId, creerAffectation, mettreAJourAffectation],
  );

  const gererValider = useCallback(async () => {
    if (!peutValider) return;
    if (matieresManquantes.length > 0) {
      return;
    }
    if (hasBloquant) {
      if (!window.confirm(dictRdep.alerteBloquante)) return;
    }
    await validerRepartition();
  }, [peutValider, matieresManquantes, hasBloquant, validerRepartition]);
  const matieresManquantesAlerte =
    matieresManquantes.length > 0 && (
      <Alerte
        variante="attention"
        titre={dictRdep.matièresSansAffectation}
        message={
          matieresManquantes.length > 1
            ? `${matieresManquantes.length} ${dictRdep.matieresManquantes}`
            : `${matieresManquantes.length} ${dictRdep.matieresManquantes}`
        }
        fermable={false}
      />
    );

  const blocageValidation = !peutValider || matieresManquantes.length > 0 || hasBloquant;
  const motifBlocage = useMemo(() => {
    if (!peutValider) return dictRdep.validationNonDisponibleEtat;
    if (matieresManquantes.length > 0) return dictRdep.toutesMatieresDoiventAvoirAffectation;
    if (hasBloquant) return dictRdep.alerteBloquante;
    return '';
  }, [peutValider, matieresManquantes.length, hasBloquant]);
  if (chargementDonnees) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <span role="status" aria-label="Chargement" style={{ width: '20px', height: '20px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>Chargement de la répartition…</span>
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
    <section
      data-testid="ec-rdep-01"
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
            {dictRdep.titreSaisie} — {departementId}
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
          <span style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-primary)' }}>Répartition pédagogique</span>
        </nav>
      </header>

      {estValide && valideLe && (
        <Alerte
          variante="succès"
          titre={dictRdep.repartitionValidee}
          message={`Répartition validée le ${new Date(valideLe).toLocaleDateString('fr-FR')}. Les champs sont en lecture seule.`}
          fermable={false}
        />
      )}

      {messageSucces && (
        <Alerte variante="succès" titre="Succès" message={messageSucces} fermable={true} onFermer={() => setMessageSucces(undefined)} />
      )}

      {matieresManquantesAlerte}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-l)' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
          <h2
            style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 600,
              margin: 0,
              color: 'var(--color-text-primary)',
            }}
          >
            {dictRdep.affectationsDepartement}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-s)' }}>
            <Input
              label={dictRdep.recherche ?? 'Rechercher…'}
              placeholder={dictRdep.recherche ?? 'Rechercher enseignant ou matière…'}
              value={recherche}
              onChange={(valeur) => setRecherche(valeur)}
            />
            <Bouton
              variante="primaire"
              taille="moyenne"
              disabled={estLectureSeule || chargementCreation || chargementModification}
              onClick={gererNouvelleAffectation}
              libelle={dictBouton.ajouter}
            />
          </div>

          {affectations.length === 0 && (
            <Alerte variante="info" titre={dictRdep.aucuneAffectation} message={dictRdep.aucuneAffectationDetaille} />
          )}

          {affectationsFiltrees.map((aff) => (
            <div
              key={aff.id}
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
              <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)', flex: 1, minWidth: 0 }}>
                {enseignantNomParId.get(aff.enseignantId) ?? aff.enseignantId} →
                {matiereParId.get(aff.matiereId)?.libelle ?? aff.matiereId} /
                {groupeParId.get(aff.groupeId)?.libelle ?? aff.groupeId} ({aff.volumeHebdo} h)
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                {!estLectureSeule && (
                  <Bouton
                    variante="fantome"
                    taille="petite"
                    disabled={chargementModification || chargementSuppression}
                    onClick={() => gererModifierAffectation(aff)}
                    libelle={dictRdep.modifier}
                  />
                )}
                {!estLectureSeule && (
                  <Bouton
                    variante="danger"
                    taille="petite"
                    disabled={chargementModification || chargementSuppression}
                    onClick={() => gererSupprimerAffectation(aff.id)}
                    libelle={dictRdep.supprimer}
                  />
                )}
              </div>
            </div>
          ))}
        </section>

        {affectationSelectionnee || !estLectureSeule ? (
          <AffectationEditor
            affectation={affectationSelectionnee}
            enseignants={enseignantsPourEditeur}
            matieres={donneesPage?.matieres ?? []}
            groupes={donneesPage?.groupes ?? []}
            typesEnseignement={donneesPage?.typesEnseignement ?? []}
            chargeEnseignant={chargeEnseignant}
            lectureSeule={estLectureSeule}
            chargement={chargementCreation || chargementModification}
            erreur={undefined}
            surSoumettre={gererSoumettreAffectation}
            surAnnuler={gererNouvelleAffectation}
          />
        ) : null}
      </div>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <h3 style={{ fontSize: 'var(--font-size-h3)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>{dictRdep.chargeDepartement}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
            {dictRdep.enseignantsCharge} : {resultatCharge.parEnseignant.length}
          </span>
          <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
            {dictRdep.tauxDepassement} : {resultatCharge.tauxDepassement.toFixed(1)}%
          </span>
          <Badge
            variante={
              hasBloquant
                ? 'erreur'
                : resultatCharge.alertes.some(
                    (a: AlerteCharge) => a.severite === 'AVERTISSEMENT',
                  )
                  ? 'attention'
                  : 'succès'
            }
            libelle={
              hasBloquant
                ? dictRdep.bloquant
                : resultatCharge.alertes.some(
                    (a: AlerteCharge) => a.severite === 'AVERTISSEMENT',
                  )
                  ? dictRdep.attention
                  : dictRdep.conform
            }
          />
        </div>

        <div style={{ marginTop: 'var(--space-m)', padding: 'var(--space-m)', border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-variant)' }}>
          <h4 style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, margin: '0 0 var(--space-s) 0', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
            {dictRdep.actionsWorkflow}
          </h4>
          <Bouton
            variante="primaire"
            taille="moyenne"
            disabled={blocageValidation || chargementValidation}
            chargement={chargementValidation}
            onClick={gererValider}
            libelle={dictBouton.confirmer}
          />
          {blocageValidation && (
            <span
              style={{
                fontSize: 'var(--font-size-caption)',
                color: 'var(--color-text-secondary)',
                marginTop: 'var(--space-xxs)',
              }}
            >
              {motifBlocage}
            </span>
          )}
        </div>
      </aside>
    </section>
  );
}

export default EC_RDEP_01;
