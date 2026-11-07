// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useState, useCallback, type ChangeEvent } from 'react';
import { api } from '@/lib/api';
import {
  zApercuImport,
  zRapportImport,
  type ApercuImport,
  type RapportImport,
  type TypeReferentielImportable,
} from '@takt/contracts';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import RapportImportComposant from './RapportImport';

const DICO = DICTIONNAIRE_FR.importCsv as Record<string, string | Record<string, string>>;
const t = (cle: string): string => {
  const valeur = (DICO as Record<string, unknown>)[cle];
  return typeof valeur === 'string' ? valeur : cle;
};

const TYPES_REFERENTIEL: readonly {
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

export default function ImportAssistant(): JSX.Element {
  const [typeSelectionne, setTypeSelectionne] = useState<TypeReferentielImportable>('site');
  const [contenuCsv, setContenuCsv] = useState('');
  const [etape, setEtape] = useState<'saisie' | 'aperçu' | 'rapport'>('saisie');
  const [apercu, setApercu] = useState<ApercuImport | null>(null);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [erreurApi, setErreurApi] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const lireFichier = useCallback(
    (evenement: ChangeEvent<HTMLInputElement>): void => {
      const fichier = evenement.target.files?.[0];
      if (!fichier) {
        return;
      }
      const lecteur = new FileReader();
      lecteur.onload = () => {
        setContenuCsv(String(lecteur.result ?? ''));
        setErreurApi(null);
        setEtape('saisie');
      };
      lecteur.readAsText(fichier);
    },
    [],
  );

  const executerApercu = useCallback(async (): Promise<void> => {
    setChargement(true);
    setErreurApi(null);
    try {
      const reponse = await api.post<unknown>('/referentiels/import/apercu', {
        type: typeSelectionne,
        contenu: contenuCsv,
      });
      const donneesValidees = zApercuImport.parse((reponse as { data: unknown }).data);
      setApercu(donneesValidees);
      setEtape('aperçu');
    } catch (err) {
      setErreurApi(err instanceof Error ? err.message : t('erreur'));
    } finally {
      setChargement(false);
    }
  }, [contenuCsv, typeSelectionne]);

  const executerImport = useCallback(async (): Promise<void> => {
    if (!apercu) {
      return;
    }
    setChargement(true);
    setErreurApi(null);
    try {
      const reponse = await api.post<unknown>('/referentiels/import/executer', {
        type: apercu.type,
        contenu: contenuCsv,
        empreinte: apercu.empreinte,
      });
      const donneesValidees = zRapportImport.parse((reponse as { data: unknown }).data);
      setRapport(donneesValidees);
      setEtape('rapport');
    } catch (err) {
      setErreurApi(err instanceof Error ? err.message : t('erreur'));
    } finally {
      setChargement(false);
    }
  }, [apercu, contenuCsv]);

  const lignesErreurApercu = apercu?.erreurs ?? [];

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('titre')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('sousTitre')}</p>
      </div>

      {erreurApi && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {erreurApi}
        </div>
      )}

      <form
        onChange={() => {
          setErreurApi(null);
          if (etape !== 'saisie') {
            setEtape('saisie');
          }
        }}
        className="mt-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="import-type" className="text-sm font-medium text-gray-700">
              {t('type')}
            </label>
            <select
              id="import-type"
              value={typeSelectionne}
              onChange={(evenement) => {
                setTypeSelectionne(evenement.target.value as TypeReferentielImportable);
                setErreurApi(null);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 pl-3 pr-10 text-sm"
            >
              {TYPES_REFERENTIEL.map((typeRef) => (
                <option key={typeRef.valeur} value={typeRef.valeur}>
                  {typeRef.libelle}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="import-fichier" className="text-sm font-medium text-gray-700">
              {t('fichier')}
            </label>
            <input
              id="import-fichier"
              type="file"
              accept=".csv"
              onChange={lireFichier}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            <p className="mt-1 text-xs text-gray-500">{t('fichierAide')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="import-contenu" className="text-sm font-medium text-gray-700">
            Contenu CSV
          </label>
          <textarea
            id="import-contenu"
            value={contenuCsv}
            onChange={(evenement) => {
              setContenuCsv(evenement.target.value);
              setErreurApi(null);
            }}
            rows={8}
            className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 pl-3 pr-3 text-sm font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={chargement || contenuCsv.trim() === ''}
            onClick={executerApercu}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chargement ? 'Chargement…' : t('apercu')}
          </button>
          {etape === 'aperçu' && (
            <button
              type="button"
              disabled={chargement || !apercu}
              onClick={executerImport}
              className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('executer')}
            </button>
          )}
          {etape === 'aperçu' && (
            <button
              type="button"
              onClick={() => {
                setEtape('saisie');
                setErreurApi(null);
              }}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('modifier')}
            </button>
          )}
        </div>
      </form>

      {etape === 'aperçu' && apercu ? (
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">{t('apercu')}</h3>
          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-md border border-gray-200 p-3 text-center">
              <div className="text-xs font-semibold text-gray-500 uppercase">{t('lignesTotales')}</div>
              <div className="mt-1 font-medium text-gray-900">{apercu.totalLignes}</div>
            </div>
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center">
              <div className="text-xs font-semibold text-green-700 uppercase">{t('lignesValides')}</div>
              <div className="mt-1 font-medium text-green-900">{apercu.lignesValides}</div>
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center">
              <div className="text-xs font-semibold text-red-700 uppercase">{t('lignesRejetees')}</div>
              <div className="mt-1 font-medium text-red-900">{apercu.lignesInvalides}</div>
            </div>
          </div>
          {lignesErreurApercu.length > 0 ? (
            <>
              <h4 className="mt-4 mb-2 text-xs font-semibold text-gray-500 uppercase">
                Erreurs ligne à ligne
              </h4>
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        {t('ligne')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        {t('champ')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        {t('valeur')}
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        {t('motif')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesErreurApercu.map((erreur) => (
                      <tr key={`${erreur.ligne}-${erreur.champ}`}>
                        <td className="px-3 py-2 text-left text-sm text-gray-700">
                          {erreur.ligne}
                        </td>
                        <td className="px-3 py-2 text-left text-sm text-gray-700">
                          {erreur.champ}
                        </td>
                        <td className="px-3 py-2 text-left text-sm text-gray-700">
                          {erreur.valeur}
                        </td>
                        <td className="px-3 py-2 text-left text-sm text-gray-700">
                          {erreur.motif}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {etape === 'rapport' && rapport ? (
        <RapportImportComposant rapport={rapport} surNouvelImport={() => setEtape('saisie')} />
      ) : null}
    </section>
  );
}