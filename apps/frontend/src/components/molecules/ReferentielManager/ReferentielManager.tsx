// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { api, versPagination } from '@/lib/api';
import { zReponseListe } from '@/lib/validation';
import { ErreurHttp } from '@/lib/errors';
import {
  EtatDonnees,
  VarianteBouton,
  VarianteInput,
  TailleComposant,
  VarianteAlerte,
} from '../../types';
import { TriDataTable, MetaPagination } from '../DataTable/DataTable.types';
import { traduction, DICTIONNAIRE_FR } from '@/i18n/fr';
import { ConfigurationReferentiel } from './ReferentielManager.types';
import { DataTable } from '../DataTable/DataTable';
import { SearchBar } from '../SearchBar';
import { Paginator } from '../Paginator';
import { Modal } from '../Modal';
import { FormulaireReferentiel } from './FormulaireReferentiel';
import { ConfirmationSuppression } from './ConfirmationSuppression';
import { Alerte } from '../../atoms/Alerte';
import { Bouton } from '../../atoms/Bouton';

interface ReferentielManagerProps<T> {
  readonly configuration: ConfigurationReferentiel<T>;
}

/** Extrait l’identifiant d’un item selon la clef configurée. */
function idDe<T>(item: T, cleId: string): string {
  return String((item as Record<string, unknown>)[cleId]);
}

/** Extrait le message lisible d’une erreur API. */
function messageErreurApi(erreur: unknown): string {
  if (erreur instanceof ErreurHttp) {
    return erreur.message ?? 'Une erreur est survenue.';
  }
  return 'Une erreur est survenue.';
}

export function ReferentielManager<T>({ configuration }: ReferentielManagerProps<T>): JSX.Element {
  const cleId = configuration.cleId ?? 'id';
  const dictBouton = traduction('bouton') as typeof DICTIONNAIRE_FR['bouton'];
  const dictReferentiel = traduction('referentiel') as typeof DICTIONNAIRE_FR['referentiel'];
  const dictEtat = traduction('etat') as typeof DICTIONNAIRE_FR['etat'];
  const dictAlerte = traduction('alerte') as typeof DICTIONNAIRE_FR['alerte'];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [tri, setTri] = useState<TriDataTable | null>(null);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [mode, setMode] = useState<'creation' | 'modification'>('creation');
  const [itemEnEdition, setItemEnEdition] = useState<T | null>(null);
  const [idASupprimer, setIdASupprimer] = useState<string | null>(null);
  const [messageSucces, setMessageSucces] = useState<string | undefined>(undefined);
  const [erreurMetier, setErreurMetier] = useState<string | undefined>(undefined);

  // ------------------------------------------------------------------
  // Liste (useQuery)
  // ------------------------------------------------------------------
  const {
    data: resultatListe,
    isLoading,
    error: erreurListe,
    refetch: refetchListe,
  } = useQuery({
    queryKey: [
      'referentiels',
      configuration.cle,
      page,
      pageSize,
      search,
      tri?.cle,
      tri?.direction,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set(configuration.paramPage ?? 'page', String(page));
      params.set(configuration.paramPageSize ?? 'pageSize', String(pageSize));
      if (search) {
        params.set(configuration.paramSearch ?? 'search', search);
      }
      if (tri?.cle) {
        params.set(configuration.paramTri ?? 'sortBy', tri.cle);
        params.set(configuration.paramDirection ?? 'sortDirection', tri.direction);
      }
      const chemin = `${configuration.endpoint}?${params.toString()}`;
      const reponse = await api.get<T[]>(chemin, {
        schema: zReponseListe(configuration.schemaItem),
      });
      return {
        items: reponse.data ?? [],
        meta: versPagination(reponse.meta),
      };
    },
  });

  const donnees: readonly T[] = resultatListe?.items ?? [];
  const meta: MetaPagination | undefined = resultatListe?.meta;

  let etat: EtatDonnees = 'succès';
  if (isLoading) {
    etat = 'chargement';
  } else if (erreurListe) {
    etat = 'erreur';
  } else if (donnees.length === 0) {
    etat = 'vide';
  }
  // ------------------------------------------------------------------
  // Mutations
  // ------------------------------------------------------------------
  const mutationCreation = useMutation({
    mutationFn: async (valeurs: Record<string, unknown>) => {
      const reponse = await api.post(configuration.endpoint, valeurs, {
        schema: configuration.schemaCreation,
      });
      return reponse.data;
    },
    onSuccess: async () => {
      setMessageSucces(configuration.libelleSuccesCreation ?? dictReferentiel.succesCreation);
      await refetchListe();
      fermerModale();
    },
    onError: (erreur: unknown) => {
      setErreurMetier(messageErreurApi(erreur));
    },
  });

  const mutationModification = useMutation({
    mutationFn: async ({ id, valeurs }: { id: string; valeurs: Record<string, unknown> }) => {
      const reponse = await api.patch(`${configuration.endpoint}/${id}`, valeurs, {
        schema: configuration.schemaModification,
      });
      return reponse.data;
    },
    onSuccess: async () => {
      setMessageSucces(
        configuration.libelleSuccesModification ?? dictReferentiel.succesModification,
      );
      await refetchListe();
      fermerModale();
    },
    onError: (erreur: unknown) => {
      setErreurMetier(messageErreurApi(erreur));
    },
  });

  const mutationSuppression = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`${configuration.endpoint}/${id}`, { schema: z.object({}) });
    },
    onSuccess: async () => {
      setMessageSucces(
        configuration.libelleSuccesSuppression ?? dictReferentiel.succesSuppression,
      );
      await refetchListe();
      setIdASupprimer(null);
    },
    onError: (erreur: unknown) => {
      setErreurMetier(messageErreurApi(erreur));
      setIdASupprimer(null);
    },
  });

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const fermerModale = useCallback(() => {
    setModaleOuverte(false);
    setMode('creation');
    setItemEnEdition(null);
    setErreurMetier(undefined);
    setMessageSucces(undefined);
  }, []);

  const ouvrirCreation = useCallback(() => {
    setMode('creation');
    setItemEnEdition(null);
    setErreurMetier(undefined);
    setModaleOuverte(true);
  }, []);

  const ouvrirModification = useCallback(
    (item: T) => {
      setMode('modification');
      setItemEnEdition(item);
      setErreurMetier(undefined);
      setModaleOuverte(true);
    },
    [],
  );

  const demanderSuppression = useCallback(
    (item: T) => {
      setIdASupprimer(idDe(item, cleId));
    },
    [cleId],
  );

  const confirmerSuppression = useCallback(() => {
    if (!idASupprimer) {
      return;
    }
    const idCible = idASupprimer;
    setIdASupprimer(null);
    mutationSuppression.mutate(idCible);
  }, [idASupprimer, mutationSuppression]);

  const annulerSuppression = useCallback(() => {
    setIdASupprimer(null);
  }, []);

  const defaultValuesFormulaire = useMemo(() => {
    if (mode === 'creation') {
      return Object.fromEntries(
        configuration.champsFormulaire.map((champ) => [
          champ.cle,
          champ.type === 'boolean' ? false : '',
        ]),
      ) as Record<string, unknown>;
    }
    return (itemEnEdition as Record<string, unknown> ?? {});
  }, [mode, itemEnEdition, configuration.champsFormulaire]);

  const gererSoumission = useCallback(
    async (valeurs: Record<string, unknown>) => {
      try {
        if (mode === 'creation') {
          await mutationCreation.mutateAsync(valeurs);
        } else if (itemEnEdition) {
          await mutationModification.mutateAsync({
            id: idDe(itemEnEdition, cleId),
            valeurs,
          });
        }
      } catch {
        // L’erreur est deja stockee dans erreurMetier par onError de la mutation.
        void 0;
      }
    },
    [mode, itemEnEdition, cleId, mutationCreation, mutationModification],
  );

  const actionsLigne = useCallback(
    (item: T) => {
      const idItem = idDe(item, cleId);
      return (
        <>
          <Bouton
            key={`modifier-${idItem}`}
            variante="contour"
            taille="petite"
            libelle={dictBouton.modifier}
            onClick={() => ouvrirModification(item)}
          />
          <Bouton
            key={`supprimer-${idItem}`}
            variante="danger"
            taille="petite"
            libelle={dictBouton.supprimer}
            onClick={() => demanderSuppression(item)}
          />
        </>
      );
    },
    [cleId, dictBouton, ouvrirModification, demanderSuppression],
  );

  // ------------------------------------------------------------------
  // Rendu
  // ------------------------------------------------------------------
  const titreModal =
    mode === 'creation'
      ? `${dictBouton.ajouter} : ${configuration.libelle}`
      : `${dictBouton.modifier} : ${configuration.libelle}`;
  const titreAlerteProp: string | undefined = dictAlerte.attention;

  // Props optionnelles typées | undefined, passées via spread conditionnel
  // pour respecter exactOptionalPropertyTypes.
  const messageErreurProp: string | undefined = (erreurListe as unknown as ErreurHttp | undefined)
    ?.message;
  const messageSuccesProp: string | undefined = messageSucces;

  return (
    <section
      aria-label={`Référentiel : ${configuration.libelle}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-m)' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-s)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--color-text-primary)',
          }}
        >
          {configuration.libelle}
        </h2>
        <Bouton variante="primaire" taille="moyenne" libelle={dictBouton.ajouter} onClick={ouvrirCreation} />
      </header>

      {erreurMetier && (
        <Alerte
          variante="attention"
          titre={titreAlerteProp}
          message={erreurMetier}
          fermable={true as boolean | undefined}
          onFermer={(() => setErreurMetier(undefined)) as (() => void) | undefined}
        />
      )}

      <SearchBar
        value={search}
        onChange={(valeur: string) => {
          setSearch(valeur);
          setPage(1);
        }}
        onSearch={(valeur: string) => {
          setSearch(valeur);
          setPage(1);
        }}
        placeholder={dictReferentiel.recherche}
      />

              <DataTable<T>
        colonnes={configuration.colonnes}
        donnees={donnees}
        etat={etat}
        {...(meta ? { meta } : {})}
        valeurRecherche={search as string | undefined}
        {...(messageErreurProp ? { messageErreur: messageErreurProp } : {})}
        surTri={(cle: string, direction: 'asc' | 'desc' | null) =>
          setTri(direction ? { cle, direction } : null)}
        surChangementPage={((page: number) => setPage(page)) as ((page: number) => void) | undefined}
        surReessayer={(refetchListe as (() => void) | undefined)}
        actions={(actionsLigne as ((item: T) => React.ReactNode) | undefined)}
        libelleVide={(configuration.messageVide ?? dictReferentiel.vide) as string | undefined}
        {...(messageSuccesProp ? { messageSucces: messageSuccesProp } : {})}
        ariaLabel={(`Liste des ${configuration.libelle.toLowerCase()}`) as string | undefined}
      />

      {modaleOuverte && (
        <Modal
          ouvert={true}
          titre={titreModal}
          onFermer={fermerModale}
          onValider={() => void gererSoumission({})}
        >
          <FormulaireReferentiel
            champs={configuration.champsFormulaire}
            schema={
              mode === 'creation' ? configuration.schemaCreation : configuration.schemaModification
            }
            defaultValues={defaultValuesFormulaire}
            chargement={mutationCreation.isPending || mutationModification.isPending}
            libelleBouton={mode === 'creation' ? dictBouton.ajouter : dictBouton.modifier}
            {...(erreurMetier ? { erreur: erreurMetier } : {})}
            surSoumettre={gererSoumission}
          />
        </Modal>
      )}

      {idASupprimer && (
        <ConfirmationSuppression
          libelle={dictReferentiel.confirmationSuppression}
          surConfirmer={confirmerSuppression}
          surAnnuler={annulerSuppression}
          chargement={mutationSuppression.isPending}
        />
      )}
    </section>
  );
}
