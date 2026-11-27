// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { versionStore } from '@/stores/versionStore';
import { repartitionApi } from '@/lib/repartition.api';
import { Bouton } from '@/components/atoms/Bouton';
import { Alerte } from '@/components/atoms/Alerte';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Badge } from '@/components/atoms/Badge';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import type { Departement, StatutValidationRepartition } from '@takt/contracts';

interface DonneesPage {
  statuts: StatutValidationRepartition[];
  departements: Departement[];
}

function EC_RDEP_05(): JSX.Element {
  const dictBouton = traduction('bouton') as (typeof DICTIONNAIRE_FR)['bouton'];
  const dictRdep = traduction('rdep') as (typeof DICTIONNAIRE_FR)['rdep'];
  const { contexteRepartition } = versionStore((state) => ({
    contexteRepartition: state.contexteRepartition,
  }));
  const navigate = useNavigate();

  const { versionId = '' } = contexteRepartition ?? {};

  const [filtreDepartement, setFiltreDepartement] = useState<string>('');
  const [filtreEtat, setFiltreEtat] = useState<string>('');
  const [recherche, setRecherche] = useState('');

  const {
    data: donneesPage,
    isLoading: chargementDonnees,
    error: erreurDonnees,
    refetch: refetchDonnees,
  } = useQuery<DonneesPage, Error>({
    queryKey: ['rdep', 'consultation', versionId],
    queryFn: async () => {
      const [statuts, deps] = await Promise.all([
        repartitionApi.listerStatutsValidation(versionId),
        repartitionApi.listerDepartements(),
      ]);
      return {
        statuts,
        departements: deps.items,
      } as DonneesPage;
    },
    enabled: !!versionId,
    staleTime: 2 * 60 * 1000,
  });

  const statuts = donneesPage?.statuts ?? [];
  const departements = donneesPage?.departements ?? [];

  const nomDepartement = (id: string) => {
    const d = departements.find((dp) => dp.id === id);
    return d ? `${d.code} — ${d.libelle}` : id;
  };

  const etatLibelle = (etat: string) => {
    switch (etat) {
      case 'VALIDE': return dictRdep.etatValide;
      case 'EN_COURS': return dictRdep.etatEnCours;
      case 'REVALIDATION_REQUISE': return dictRdep.etatRevalidationRequise;
      case 'REJETE': return dictRdep.etatRejete;
      default: return etat;
    }
  };

  const etatVariante = (etat: string) => {
    switch (etat) {
      case 'VALIDE': return 'succès';
      case 'EN_COURS': return 'attention';
      case 'REVALIDATION_REQUISE': return 'attention';
      case 'REJETE': return 'erreur';
      default: return 'attention';
    }
  };

  const lignesFiltrees = useMemo(() => {
    return statuts.filter((s) => {
      if (filtreDepartement && s.departementId !== filtreDepartement) return false;
      if (filtreEtat && s.etat !== filtreEtat) return false;
      if (recherche) {
        const terme = recherche.toLowerCase();
        return nomDepartement(s.departementId).toLowerCase().includes(terme);
      }
      return true;
    });
  }, [statuts, filtreDepartement, filtreEtat, recherche]);
  if (chargementDonnees) {
    return (
      <section style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
        <span role="status" aria-label="Chargement" style={{ width: '20px', height: '20px', border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        <span style={{ fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>Chargement de la consultation…</span>
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
    <section data-testid="ec-rdep-05" style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-s)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
            {dictRdep.titreConsultation}
          </h1>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', margin: 'var(--space-xxs) 0 0 0' }}>
            Version {versionId} · Tous les départements — lecture seule
          </p>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)' }} aria-label="Fil d'Ariane">
          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>Tableau de bord</span>
          <span style={{ fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-primary)' }}>Consultation transversale</span>
        </nav>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-m)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{dictRdep.filtreDepartement}</label>
          <Select
            id="filtre-departement"
            label={dictRdep.filtreDepartement}
            value={filtreDepartement}
            onChange={setFiltreDepartement}
            options={departements.map((d) => ({
              valeur: d.id,
              libelle: `${d.code} — ${d.libelle}`,
            }))}
            placeholder={dictRdep.selectionner ?? 'Sélectionnez…'}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{dictRdep.filtreEtat}</label>
          <Select
            id="filtre-etat"
            label={dictRdep.filtreEtat}
            value={filtreEtat}
            onChange={setFiltreEtat}
            options={[
              { valeur: 'VALIDE', libelle: dictRdep.etatValide },
              { valeur: 'EN_COURS', libelle: dictRdep.etatEnCours },
              { valeur: 'REVALIDATION_REQUISE', libelle: dictRdep.etatRevalidationRequise },
              { valeur: 'REJETE', libelle: dictRdep.etatRejete },
            ]}
            placeholder={dictRdep.selectionner ?? 'Sélectionnez…'}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <label style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{dictRdep.rechercheGlobale}</label>
          <Input
            id="recherche-globale"
            label={dictRdep.rechercheGlobale}
            placeholder={dictRdep.rechercheGlobale}
            value={recherche}
            onChange={(valeur) => setRecherche(valeur)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-s)' }}>
          <Bouton
            variante="secondaire"
            taille="moyenne"
            onClick={() => {
              setFiltreDepartement('');
              setFiltreEtat('');
              setRecherche('');
            }}
            libelle={dictBouton.annuler}
          />
          <Bouton
            variante="secondaire"
            taille="moyenne"
            onClick={() => {
              alert('Export CSV à implémenter (écart backend).');
            }}
            libelle={dictRdep.exporterCsv}
          />
        </div>
      </div>
      {lignesFiltrees.length === 0 && (
        <Alerte variante="info" titre="Aucune donnée" message={dictRdep.aucuneDonneeConsultation} fermable={false} />
      )}

      {lignesFiltrees.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: 'var(--border-width) solid var(--color-divider)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dictRdep.colonneDepartement}</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dictRdep.colonneEtat}</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-s)', fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dictRdep.colonneActions}</th>
              </tr>
            </thead>
            <tbody>
              {lignesFiltrees.map((s) => (
                <tr
                  key={s.departementId}
                  style={{ borderBottom: 'var(--border-width) solid var(--color-divider)' }}
                >
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    {nomDepartement(s.departementId)}
                  </td>
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    <Badge variante={etatVariante(s.etat)} libelle={etatLibelle(s.etat)} />
                  </td>
                  <td style={{ padding: 'var(--space-s)', fontSize: 'var(--font-size-body)', color: 'var(--color-text-primary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xxs)', padding: 'var(--space-xxs) var(--space-s)', border: 'var(--border-width) solid var(--color-divider)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 'var(--font-size-caption)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                      {dictRdep.badgeLectureSeule}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Bouton
          variante="contour"
          taille="moyenne"
          onClick={() => navigate('/dashboard')}
          libelle={dictBouton.fermer}
        />
      </div>

      <div style={{ marginTop: 'var(--space-l)', padding: 'var(--space-m)', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-variant)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>
        {dictRdep.ecartBackendLecture}
      </div>
    </section>
  );
}

export default EC_RDEP_05;
