// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bouton } from '@/components/atoms/Bouton';
import { Select } from '@/components/atoms/Select';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { Alerte } from '@/components/atoms/Alerte';
import { contraintesApi } from '@/lib/contraintes.api';
import { SelecteurVersion } from './SelecteurVersion';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import { type Contrainte, type TypeContrainte } from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.ges.contraintes as unknown as Record<string, string | Record<string, string>>;

function t(cle: string): string {
  const valeur = DICO[cle];
  return typeof valeur === 'string' ? valeur : cle;
}

const TYPES_CONTRAINTE: { valeur: TypeContrainte; libelle: string }[] = [
  { valeur: 'INDISPONIBILITE', libelle: 'Indisponibilité' },
  { valeur: 'EXIGENCE_SALLE', libelle: 'Exigence de salle' },
  { valeur: 'PREFERENCE_CRENEAU', libelle: 'Préférence de créneau' },
  { valeur: 'CRENEAU_EVITE', libelle: 'Créneau à éviter' },
  { valeur: 'JOUR_PREFERE', libelle: 'Jour préféré' },
  { valeur: 'SALLE_PREFEREE', libelle: 'Salle préférée' },
];

export function ContraintesPage(): JSX.Element {
  const navigate = useNavigate();
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string>('');
  const [contraintes, setContraintes] = useState<Contrainte[]>([]);
  const [total, setTotal] = useState(0);
  const [filtreType, setFiltreType] = useState<TypeContrainte | ''>('');
  const [filtreActif, setFiltreActif] = useState<string>('');

  const chargerContraintes = useCallback(async (): Promise<void> => {
    if (!versionId) {
      setContraintes([]);
      setTotal(0);
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const params: {
        versionId: string;
        type?: string;
        estActif?: boolean;
        page: number;
        pageSize: number;
      } = { versionId, page: 1, pageSize: 50 };
      if (filtreType) params.type = filtreType;
      if (filtreActif !== '') params.estActif = filtreActif === 'true';

      const reponse = await contraintesApi.lister(params);
      setContraintes(reponse.items);
      setTotal(reponse.meta.total ?? 0);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Impossible de charger les contraintes.');
    } finally {
      setChargement(false);
    }
  }, [versionId, filtreType, filtreActif]);

  useEffect(() => {
    chargerContraintes();
  }, [chargerContraintes]);

  if (chargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (erreur) {
    return <Alerte variante="erreur" message={erreur} />;
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 'var(--space-m)', borderBottom: 'var(--border-width) solid var(--color-border)' }}>
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>EC-GES-03</span>
        <h1 style={{ fontSize: 'var(--font-size-h1)', margin: 0 }}>{t('titre')}</h1>
      </header>

      <section style={{ padding: 'var(--space-m)', display: 'flex', gap: 'var(--space-s)', flexWrap: 'wrap', alignItems: 'center' }}>
        <SelecteurVersion versionIdSelectionnee={versionId || null} surSelection={setVersionId} />
        <Select
          id="filtre-type"
          label={t('filtrerParType')}
          value={filtreType}
          onChange={(v) => setFiltreType(v as TypeContrainte)}
          options={TYPES_CONTRAINTE.map((t) => ({ valeur: t.valeur, libelle: t.libelle }))}
          placeholder={t('tousTypes')}
        />
        <Select
          id="filtre-actif"
          label={t('filtrerParActif')}
          value={filtreActif}
          onChange={(v) => setFiltreActif(v)}
          options={[
            { valeur: 'true', libelle: t('actif') },
            { valeur: 'false', libelle: t('inactif') },
          ]}
          placeholder={t('tousStatuts')}
        />
        <Bouton variante="contour" libelle={t('retourTableauDeBord')} onClick={() => navigate('/dashboard')} taille="petite" />
      </section>

      {!versionId ? (
        <section style={{ padding: 'var(--space-m)', color: 'var(--color-text-secondary)' }}>
          <p>{t('selectionnerVersion')}</p>
        </section>
      ) : (
        <>
          <section style={{ padding: 'var(--space-m)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-s)' }}>
              <h2 style={{ fontSize: 'var(--font-size-h2)', margin: 0 }}>{t('listeContraintes').replace('{count}', String(total))}</h2>
              <Bouton libelle={t('ajouterContrainte')} onClick={() => navigate(`/ges/constraints/nouvelle`)} />
            </div>
            {contraintes.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>{t('aucuneContrainte')}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: 'var(--border-width) solid var(--color-border)' }}>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('type')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('cible')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('valeur')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('poids')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('statut')}</th>
                    <th style={{ padding: 'var(--space-xs)', fontSize: 'var(--font-size-body-small)', color: 'var(--color-text-secondary)' }}>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {contraintes.map((c) => (
                    <tr key={c.id} style={{ borderBottom: 'var(--border-width) solid var(--color-border-light)' }}>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.type}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.cibleId}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.valeur}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.poids ?? '-'}</td>
                      <td style={{ padding: 'var(--space-xs)' }}>{c.estActif ? t('actif') : t('inactif')}</td>
                      <td style={{ padding: 'var(--space-xs)', display: 'flex', gap: 'var(--space-xs)' }}>
                        <Bouton libelle={t('modifier')} variante="contour" onClick={() => navigate(`/ges/constraints/${c.id}`)} taille="petite" />
                        <Bouton libelle={t('supprimer')} variante="danger" onClick={() => {
                          if (window.confirm(t('confirmerSuppression'))) {
                            contraintesApi.supprimer({ id: c.id }).then(() => chargerContraintes()).catch((err) => setErreur(err instanceof Error ? err.message : 'Erreur lors de la suppression.'));
                          }
                        }} taille="petite" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
