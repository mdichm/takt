// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bouton } from '@/components/atoms/Bouton';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { Alerte } from '@/components/atoms/Alerte';
import { api } from '@/lib/api';
import { repartitionApi } from '@/lib/repartition.api';
import { calculerCouverturePlan, type CouvertureMatiere, tauxCouvertureGlobal } from '@/lib/couverturePlan';
import { SelecteurVersion } from './SelecteurVersion';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { type PlanEtudes, type PlanEtudesMatiere } from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.ges.plansEtudes as Record<string, string | Record<string, string>>;

function t(cle: string): string {
  const valeur = DICO[cle];
  return typeof valeur === 'string' ? valeur : cle;
}

export function PlanEtudesPage(): JSX.Element {
  const navigate = useNavigate();
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string>('');
  const [plan, setPlan] = useState<PlanEtudes | null>(null);
  const [matieres, setMatieres] = useState<PlanEtudesMatiere[]>([]);
  const [couverture, setCouverture] = useState<CouvertureMatiere[]>([]);

  const chargerPlan = useCallback(async (): Promise<void> => {
    if (!versionId) {
      setPlan(null);
      setMatieres([]);
      setCouverture([]);
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const [reponsePlan, reponseMatieres, reponseAffectations] =
        await Promise.all([
          api.get<unknown>(`/plans-etudes/${versionId}`),
          repartitionApi.listerMatieresPlanEtudes(versionId),
          repartitionApi.listerAffectations(versionId, ''),
        ]);
      setPlan(reponsePlan.data as PlanEtudes);
      setMatieres(reponseMatieres.items);
      setCouverture(calculerCouverturePlan(reponseMatieres.items, reponseAffectations.items));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger le plan d\u2019\u00e9tudes.');
    } finally {
      setChargement(false);
    }
  }, [versionId]);

  useEffect(() => {
    chargerPlan();
  }, [chargerPlan]);

  if (chargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (erreur) {
    return <Alerte variante="erreur" message={erreur} />;
  }

  const tauxGlobal = tauxCouvertureGlobal(couverture);
  const nonCouvertes = couverture.filter((c) => !c.couverte);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 'var(--space-m)', borderBottom: 'var(--border-width) solid var(--color-border)' }}>
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>EC-GES-02</span>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{t('titre')}</h1>
      </header>

      <section style={{ padding: 'var(--space-m)', display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap', alignItems: 'center' }}>
        <SelecteurVersion versionIdSelectionnee={versionId || null} surSelection={setVersionId} />
        <Bouton libelle={t('retourTableauDeBord')} variante="contour" onClick={() => navigate('/dashboard')} taille="petite" />
      </section>

      {!versionId ? (
        <section style={{ padding: 'var(--space-m)', color: 'var(--color-text-secondary)' }}>
          <p>{t('selectionnerVersion')}</p>
        </section>
      ) : (
        <>
          <section style={{ padding: 'var(--space-m)' }}>
            <h2 style={{ fontSize: 'var(--font-size-h2)', marginBottom: 'var(--space-s)' }}>{t('planActuel')}</h2>
            {plan ? (
              <div style={{ display: 'flex', gap: 'var(--space-m)', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ color: 'var(--color-text-secondary)' }}>{t('annee')}</strong>
                  <p>{plan.libelleParcours ?? '-'}</p>
                </div>
                <div>
                  <strong style={{ color: 'var(--color-text-secondary)' }}>{t('semestre')}</strong>
                  <p>{plan.libelleNiveau ?? '-'}</p>
                </div>
              </div>
            ) : (
              <p>{t('planIntrouvable')}</p>
            )}
          </section>

          <section style={{ padding: 'var(--space-m)' }}>
            <h2 style={{ fontSize: 'var(--font-size-h2)', marginBottom: 'var(--space-s)' }}>{t('couverture')}</h2>
            <div style={{ display: 'flex', gap: 'var(--space-m)', alignItems: 'baseline', marginBottom: 'var(--space-s)' }}>
              <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600 }}>{tauxGlobal}%</span>
              <span style={{ fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('tauxCouvertureGlobale')}</span>
            </div>
            {matieres.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>{t('aucuneMatiere')}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: 'var(--border-width) solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('matiere')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('typeEnseignement')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('heuresPrevues')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('heuresAffectees')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('taux')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('statut')}</th>
                  </tr>
                </thead>
                <tbody>
                  {couverture.map((c) => (
                    <tr key={c.matiereId} style={{ borderBottom: 'var(--border-width) solid var(--color-border-light)' }}>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.matiereLibelle}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.typeEnseignement}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.heuresPrevues}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.heuresAffectees}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.tauxCouverture}%</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.couverte ? t('couvert') : t('nonCouvert')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {nonCouvertes.length > 0 && (
              <div role="alert" aria-live="polite" style={{
                marginTop: 'var(--space-s)', padding: 'var(--space-s)',
                background: 'var(--color-attention-surbrillance)',
                color: 'var(--color-attention)', borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-body-small)',
              }}>
                {t('matieresNonCouvertes').replace('{count}', String(nonCouvertes.length))}
              </div>
            )}
          </section>
        </>
      )}

      <footer style={{ marginTop: 'var(--space-l)', textAlign: 'right', padding: 'var(--space-m)' }}>
        <Bouton variante="contour" libelle={t('fermer')} onClick={() => navigate('/dashboard')} taille="petite" />
      </footer>
    </main>
  );
}