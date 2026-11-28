// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  zApercuImport,
  zRapportImport,
  zImportArchiveApercu,
  zRapportImportArchive,
  type ApercuImport,
  type RapportImport,
  type ImportArchiveApercu,
  type RapportImportArchive,
  type TypeReferentielImportable,
  type TypeImportArchive,
} from '@takt/contracts';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import RapportImportComposant from './RapportImport';
import RapportImportArchiveComposant from './RapportImportArchive';

const DICO_CSV = DICTIONNAIRE_FR.importCsv as Record<string, string | Record<string, string>>;
const DICO_ARCHIVE = DICTIONNAIRE_FR.importArchive as Record<
  string,
  string | Record<string, string>
>;
const t = (
  cle: string,
  dico: Record<string, string | Record<string, string>> = DICO_CSV,
): string => {
  const valeur = (dico as Record<string, unknown>)[cle];
  return typeof valeur === 'string' ? valeur : cle;
};

type Etape = 'saisie' | 'aperçu' | 'rapport';

const TYPES_CSV: readonly {
  readonly valeur: TypeReferentielImportable;
  readonly libelle: string;
}[] = [
  { valeur: 'site', libelle: t('types.site') },
  { valeur: 'type-salle', libelle: t('types.type-salle') },
  { valeur: 'equipement', libelle: t('types.equipement') },
  { valeur: 'salle', libelle: t('types.salle') },
  { valeur: 'groupe', libelle: t('types.groupe') },
  { valeur: 'enseignant', libelle: t('types.enseignant') },
];

const TYPES_ARCHIVE: readonly { readonly valeur: TypeImportArchive; readonly libelle: string }[] = [
  { valeur: 'parcours', libelle: t('typesListe.parcours', DICO_ARCHIVE) },
  { valeur: 'groupe', libelle: t('typesListe.groupe', DICO_ARCHIVE) },
  { valeur: 'matiere', libelle: t('typesListe.matiere', DICO_ARCHIVE) },
  { valeur: 'module', libelle: t('typesListe.module', DICO_ARCHIVE) },
  { valeur: 'salle', libelle: t('typesListe.salle', DICO_ARCHIVE) },
];

export default function ImportAssistant(): JSX.Element {
  const [mode, setMode] = useState<'csv' | 'archive'>('csv');
  const [typeSelectionne, setTypeSelectionne] = useState<TypeReferentielImportable>('site');
  const [contenuCsv, setContenuCsv] = useState('');
  const [anneesSource, setAnneesSource] = useState<
    { readonly id: string; readonly libelle: string }[]
  >([]);
  const [anneeSourceId, setAnneeSourceId] = useState<string | null>(null);
  const [typesSelectionnes, setTypesSelectionnes] = useState<Set<TypeImportArchive>>(new Set());
  const [etape, setEtape] = useState<Etape>('saisie');
  const [apercuCsv, setApercuCsv] = useState<ApercuImport | null>(null);
  const [apercuArchive, setApercuArchive] = useState<ImportArchiveApercu | null>(null);
  const [rapportCsv, setRapportCsv] = useState<RapportImport | null>(null);
  const [rapportArchive, setRapportArchive] = useState<RapportImportArchive | null>(null);
  const [erreurApi, setErreurApi] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    let ignore = false;
    api
      .get<{ data: unknown }>('/referentiels/import/archive/annees-source')
      .then((reponse) => {
        if (ignore) {
          return;
        }
        setAnneesSource((reponse as { data: unknown }).data as { id: string; libelle: string }[]);
      })
      .catch(() => {
        if (ignore) {
          return;
        }
        setErreurApi(t('erreurAnneeNonCloturee', DICO_ARCHIVE));
      });
    return () => {
      ignore = true;
    };
  }, []);

  const basculerMode = (nouveau: 'csv' | 'archive'): void => {
    setMode(nouveau);
    setEtape('saisie');
    setApercuCsv(null);
    setApercuArchive(null);
    setRapportCsv(null);
    setRapportArchive(null);
    setErreurApi(null);
  };

  const executerApercu = useCallback(async (): Promise<void> => {
    setChargement(true);
    setErreurApi(null);
    try {
      if (mode === 'csv') {
        const reponse = await api.post<unknown>('/referentiels/import/apercu', {
          type: typeSelectionne,
          contenu: contenuCsv,
        });
        const donneesValidees = zApercuImport.parse((reponse as { data: unknown }).data);
        setApercuCsv(donneesValidees);
      } else {
        if (!anneeSourceId || typesSelectionnes.size === 0) {
          setErreurApi(t(!anneeSourceId ? 'anneeRequis' : 'typesRequis', DICO_ARCHIVE));
          return;
        }
        const reponse = await api.post<unknown>('/referentiels/import/archive/apercu', {
          anneeSourceId,
          types: Array.from(typesSelectionnes),
        });
        const donneesValidees = zImportArchiveApercu.parse((reponse as { data: unknown }).data);
        setApercuArchive(donneesValidees);
      }
      setEtape('aperçu');
    } catch (err) {
      setErreurApi(err instanceof Error ? err.message : t('erreur', DICO_ARCHIVE));
    } finally {
      setChargement(false);
    }
  }, [mode, typeSelectionne, contenuCsv, anneeSourceId, typesSelectionnes]);

  const executerImport = useCallback(async (): Promise<void> => {
    setChargement(true);
    setErreurApi(null);
    try {
      if (mode === 'csv') {
        if (!apercuCsv) {
          return;
        }
        const reponse = await api.post<unknown>('/referentiels/import/executer', {
          type: apercuCsv.type,
          contenu: contenuCsv,
          empreinte: apercuCsv.empreinte,
        });
        const donneesValidees = zRapportImport.parse((reponse as { data: unknown }).data);
        setRapportCsv(donneesValidees);
      } else {
        if (!apercuArchive || !anneeSourceId) {
          return;
        }
        const reponse = await api.post<unknown>('/referentiels/import/archive/executer', {
          anneeSourceId,
          types: Array.from(typesSelectionnes),
          empreinte: apercuArchive.empreinte,
        });
        const donneesValidees = zRapportImportArchive.parse((reponse as { data: unknown }).data);
        setRapportArchive(donneesValidees);
      }
      setEtape('rapport');
    } catch (err) {
      setErreurApi(err instanceof Error ? err.message : t('erreur', DICO_ARCHIVE));
    } finally {
      setChargement(false);
    }
  }, [mode, apercuCsv, contenuCsv, apercuArchive, anneeSourceId, typesSelectionnes]);

  const lignesErreurApercu = apercuCsv?.erreurs ?? [];
  const statutLibelle = (statut: string): string =>
    t(`statut_${statut}` as keyof typeof DICO_ARCHIVE, DICO_ARCHIVE);

  const estSaisie = etape === 'saisie';
  const estApercu = etape === 'aperçu';
  const estRapport = etape === 'rapport';

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {mode === 'csv' ? t('titre', DICO_CSV) : t('titre', DICO_ARCHIVE)}
      </h2>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {mode === 'csv' ? t('sousTitre', DICO_CSV) : t('sousTitre', DICO_ARCHIVE)}
      </p>

      <div className="inline-flex rounded-md p-1" style={{ border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)' }}>
        <button
          onClick={() => basculerMode('csv')}
          aria-pressed={mode === 'csv'}
          className={`px-4 py-2 text-sm font-medium`}
          style={{
            background: mode === 'csv' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: mode === 'csv' ? 'var(--color-surface)' : 'var(--color-text-primary)',
            border: `var(--border-width) solid ${mode === 'csv' ? 'transparent' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
          }}
        >
          CSV
        </button>
        <button
          onClick={() => basculerMode('archive')}
          aria-pressed={mode === 'archive'}
          className={`px-4 py-2 text-sm font-medium`}
          style={{
            background: mode === 'archive' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: mode === 'archive' ? 'var(--color-surface)' : 'var(--color-text-primary)',
            border: `var(--border-width) solid ${mode === 'archive' ? 'transparent' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
          }}
        >
          Année clôturée
        </button>
      </div>

      {mode === 'csv' && estSaisie && (
        <>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('type', DICO_CSV)}
            </label>
            <select
              value={typeSelectionne}
              onChange={(e) => setTypeSelectionne(e.target.value as TypeReferentielImportable)}
              className="w-full max-w-xs rounded-md p-3 text-sm"
              style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)' }}
            >
              {TYPES_CSV.map((type) => (
                <option key={type.valeur} value={type.valeur}>
                  {type.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label htmlFor="contenu-csv" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('fichier', DICO_CSV)}
            </label>
            <textarea
              id="contenu-csv"
              value={contenuCsv}
              onChange={(e) => setContenuCsv(e.target.value)}
              className="w-full rounded-md p-3 text-sm font-mono"
              rows={6}
              style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)' }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('fichierAide', DICO_CSV)}</p>
          </div>
          {erreurApi && (
            <div className="mt-3 rounded-md p-3 text-sm" style={{ border: `var(--border-width) solid var(--color-error)`, background: 'var(--color-error)', color: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              {erreurApi}
            </div>
          )}
          <button
            onClick={executerApercu}
            disabled={chargement || contenuCsv.trim().length === 0}
            className="mt-4 inline-flex items-center rounded-md p-3 text-sm font-medium"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-surface)',
              border: `var(--border-width) solid transparent`,
              borderRadius: 'var(--radius-md)',
              opacity: (chargement || contenuCsv.trim().length === 0) ? 0.6 : 1,
              cursor: (chargement || contenuCsv.trim().length === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            {chargement ? t('charger', DICO_CSV) : t('apercu', DICO_CSV)}
          </button>
        </>
      )}
      {mode === 'archive' && estSaisie && (
        <>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('anneeSource', DICO_ARCHIVE)}
            </label>
            <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>{t('anneeSourceAide', DICO_ARCHIVE)}</p>
            <select
              value={anneeSourceId ?? ''}
              onChange={(e) => setAnneeSourceId(e.target.value || null)}
              className="w-full max-w-xs rounded-md p-3 text-sm"
              style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">{t('anneeRequis', DICO_ARCHIVE)}</option>
              {anneesSource.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              {t('types', DICO_ARCHIVE)}
            </label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {TYPES_ARCHIVE.map((type) => {
                const selectionne = typesSelectionnes.has(type.valeur);
                return (
                  <label
                    key={type.valeur}
                    className="flex items-center gap-2 rounded-md p-2 cursor-pointer"
                    style={{
                      border: `var(--border-width) solid var(--color-border)`,
                      borderRadius: 'var(--radius-md)',
                      background: selectionne ? 'var(--color-primary-hover)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectionne}
                      onChange={() => {
                        const suivant = new Set(typesSelectionnes);
                        if (selectionne) {
                          suivant.delete(type.valeur);
                        } else {
                          suivant.add(type.valeur);
                        }
                        setTypesSelectionnes(suivant);
                      }}
                      className="rounded"
                      style={{
                        border: `var(--border-width) solid var(--color-border)`,
                        color: 'var(--color-primary)',
                      }}
                    />
                    {type.libelle}
                  </label>
                );
              })}
            </div>
          </div>
          {erreurApi && (
            <div className="mt-3 rounded-md p-3 text-sm" style={{ border: `var(--border-width) solid var(--color-error)`, background: 'var(--color-error)', color: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              {erreurApi}
            </div>
          )}
          <button
            onClick={executerApercu}
            disabled={chargement || !anneeSourceId || typesSelectionnes.size === 0}
            className="mt-4 inline-flex items-center rounded-md p-3 text-sm font-medium"
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-surface)',
              border: `var(--border-width) solid transparent`,
              borderRadius: 'var(--radius-md)',
              opacity: (chargement || !anneeSourceId || typesSelectionnes.size === 0) ? 0.6 : 1,
              cursor: (chargement || !anneeSourceId || typesSelectionnes.size === 0) ? 'not-allowed' : 'pointer',
            }}
          >
            {chargement ? t('charger', DICO_CSV) : t('apercu', DICO_ARCHIVE)}
          </button>
        </>
      )}
      {estApercu && mode === 'csv' && apercuCsv && (
        <section className="mt-6 rounded-lg p-6" style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('apercu', DICO_CSV)}</h3>
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-md p-3 text-center" style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface-variant)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                {t('lignesTotales', DICO_CSV)}
              </div>
              <div className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{apercuCsv.totalLignes}</div>
            </div>
            <div className="rounded-md p-3 text-center" style={{ border: `var(--border-width) solid var(--color-success)`, background: 'var(--color-surface)', color: 'var(--color-success)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-success)' }}>
                {t('lignesValides', DICO_CSV)}
              </div>
              <div className="mt-1 font-medium" style={{ color: 'var(--color-success)' }}>{apercuCsv.lignesValides}</div>
            </div>
            <div className="rounded-md p-3 text-center" style={{ border: `var(--border-width) solid var(--color-error)`, background: 'var(--color-surface)', color: 'var(--color-error)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-error)' }}>
                {t('lignesRejetees', DICO_CSV)}
              </div>
              <div className="mt-1 font-medium" style={{ color: 'var(--color-error)' }}>{apercuCsv.lignesInvalides}</div>
            </div>
          </div>
          {lignesErreurApercu.length > 0 ? (
            <>
              <h4 className="mt-4 mb-2 text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                Erreurs ligne à ligne
              </h4>
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('ligne', DICO_CSV)}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('champ', DICO_CSV)}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('valeur', DICO_CSV)}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                        {t('motif', DICO_CSV)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesErreurApercu.map((erreur) => (
                      <tr key={`${erreur.ligne}-${erreur.champ}`}>
                        <td className="px-3 py-2 text-left text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {erreur.ligne}
                        </td>
                        <td className="px-3 py-2 text-left text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {erreur.champ}
                        </td>
                        <td className="px-3 py-2 text-left text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {erreur.valeur}
                        </td>
                        <td className="px-3 py-2 text-left text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {erreur.motif}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
          <div className="mt-6 flex gap-2">
            <button
              onClick={executerImport}
              disabled={chargement}
              className="inline-flex items-center rounded-md p-3 text-sm font-medium" style={{ background: 'var(--color-success)', color: 'var(--color-surface)', border: `var(--border-width) solid transparent`, borderRadius: 'var(--radius-md)' }}
            >
              {t('executer', DICO_CSV)}
            </button>
            <button
              onClick={() => {
                setEtape('saisie');
                setApercuCsv(null);
              }}
              className="inline-flex items-center rounded-md p-3 text-sm font-medium" style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)' }}
            >
              {t('modifier', DICO_CSV)}
            </button>
          </div>
        </section>
      )}
      {estApercu && mode === 'archive' && apercuArchive && (
        <section className="mt-6 rounded-lg p-6" style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t('apercu', DICO_ARCHIVE)}</h3>
          <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
            <div className="rounded-md p-3 text-center" style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface-variant)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                {t('lignesTotales', DICO_ARCHIVE)}
              </div>
              <div className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{apercuArchive.totalLignes}</div>
            </div>
            <div className="rounded-md p-3 text-center" style={{ border: `var(--border-width) solid var(--color-success)`, background: 'var(--color-surface)', color: 'var(--color-success)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-success)' }}>
                {t('lignesValides', DICO_ARCHIVE)}
              </div>
              <div className="mt-1 font-medium" style={{ color: 'var(--color-success)' }}>{apercuArchive.lignesValides}</div>
            </div>
            <div className="rounded-md p-3 text-center" style={{ border: `var(--border-width) solid var(--color-info)`, background: 'var(--color-surface)', color: 'var(--color-info)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-info)' }}>
                {t('dejaImports', DICO_ARCHIVE)}
              </div>
              <div className="mt-1 font-medium" style={{ color: 'var(--color-info)' }}>{apercuArchive.dejaImports}</div>
            </div>
            <div className="rounded-md p-3 text-center" style={{ border: `var(--border-width) solid var(--color-error)`, background: 'var(--color-surface)', color: 'var(--color-error)' }}>
              <div className="text-xs font-semibold uppercase" style={{ color: 'var(--color-error)' }}>
                {t('lignesInvalides', DICO_ARCHIVE)}
              </div>
              <div className="mt-1 font-medium" style={{ color: 'var(--color-error)' }}>{apercuArchive.lignesInvalides}</div>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('code', DICO_ARCHIVE)}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    Libellé
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('statut', DICO_ARCHIVE)}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                    {t('motif', DICO_ARCHIVE)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {apercuArchive.apercuLignes.map((ligne) => (
                  <tr key={`${ligne.type}-${ligne.code}`}>
                    <td className="px-3 py-2 text-left text-sm font-mono" style={{ color: 'var(--color-text-primary)' }}>
                      {ligne.code}
                    </td>
                    <td className="px-3 py-2 text-left text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {ligne.libelle ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-left text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{
                          background:
                            ligne.statut === 'aImporter'
                              ? 'var(--color-success)'
                              : ligne.statut === 'dejaImporte'
                                ? 'var(--color-info)'
                                : 'var(--color-error)',
                          color: 'var(--color-surface)',
                        }}
                      >
                        {statutLibelle(ligne.statut)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-left text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {ligne.motif ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex gap-2">
            <button
              onClick={executerImport}
              disabled={chargement}
              className="inline-flex items-center rounded-md p-3 text-sm font-medium" style={{ background: 'var(--color-success)', color: 'var(--color-surface)', border: `var(--border-width) solid transparent`, borderRadius: 'var(--radius-md)' }}
            >
              {t('executer', DICO_ARCHIVE)}
            </button>
            <button
              onClick={() => {
                setEtape('saisie');
                setApercuArchive(null);
              }}
              className="inline-flex items-center rounded-md p-3 text-sm font-medium" style={{ border: `var(--border-width) solid var(--color-border)`, background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)' }}
            >
              {t('modifier', DICO_ARCHIVE)}
            </button>
          </div>
        </section>
      )}
      {estRapport && mode === 'csv' && rapportCsv && (
        <RapportImportComposant
          rapport={rapportCsv}
          surNouvelImport={() => {
            setEtape('saisie');
            setRapportCsv(null);
          }}
        />
      )}

      {estRapport && mode === 'archive' && rapportArchive && (
        <RapportImportArchiveComposant
          rapport={rapportArchive}
          surNouvelImport={() => {
            setEtape('saisie');
            setRapportArchive(null);
          }}
        />
      )}
    </section>
  );
}
