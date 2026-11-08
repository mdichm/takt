// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type RapportImport } from '@takt/contracts';
import { DICTIONNAIRE_FR } from '@/i18n/fr';

const DICO = DICTIONNAIRE_FR.importCsv as Record<string, string | Record<string, string>>;
const t = (cle: string): string => {
  const valeur = (DICO as Record<string, unknown>)[cle];
  return typeof valeur === 'string' ? valeur : cle;
};

interface RapportImportProps {
  readonly rapport: RapportImport;
  readonly surNouvelImport: () => void;
}

export default function RapportImport({
  rapport,
  surNouvelImport,
}: RapportImportProps): JSX.Element {
  const lignesErreur = rapport.erreurs.map((erreur) => (
    <tr key={`${erreur.ligne}-${erreur.champ}`}>
      <td className="px-3 py-2 text-left text-sm text-gray-700">{erreur.ligne}</td>
      <td className="px-3 py-2 text-left text-sm text-gray-700">{erreur.champ}</td>
      <td className="px-3 py-2 text-left text-sm text-gray-700">{erreur.valeur}</td>
      <td className="px-3 py-2 text-left text-sm text-gray-700">{erreur.motif}</td>
    </tr>
  ));

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{t('succes') as string}</h2>
      <p className="mt-1 text-sm text-gray-600">
        {t('importes')} :<span className="font-medium text-green-700">{rapport.importes}</span>{' '}
        {t('rejets')} :<span className="font-medium text-red-700">{rapport.rejets}</span>
      </p>

      {rapport.erreurs.length > 0 ? (
        <>
          <h3 className="mt-6 mb-2 text-sm font-semibold text-gray-900">{t('lignesRejetees')}</h3>
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
              <tbody>{lignesErreur}</tbody>
            </table>
          </div>
        </>
      ) : null}

      <div className="mt-6 flex gap-2">
        <button
          onClick={surNouvelImport}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('modifier')}
        </button>
        <button
          onClick={surNouvelImport}
          className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Fermer
        </button>
      </div>
    </section>
  );
}
