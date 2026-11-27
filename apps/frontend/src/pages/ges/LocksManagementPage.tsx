// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  useCallback,
  useMemo,
  useState,
  type JSX,
} from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bouton } from '@/components/atoms/Bouton';
import { Select } from '@/components/atoms/Select';
import { Input } from '@/components/atoms/Input';
import { EtatChargement } from '@/components/molecules/EtatChargement';
import { EtatVide } from '@/components/molecules/EtatVide';
import { SelecteurVersion } from '@/pages/SelecteurVersion';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import {
  planningApi,
  type Lock,
  type LockCreateInput,
} from '@/lib/planning.api';
import { type TypeVerrou } from '@takt/contracts';

const LIBELLE_TYPE_VERROU: Record<TypeVerrou, string> = {
  CRENEAU: 'Creneau',
  SALLE: 'Salle',
  ENSEIGNANT: 'Enseignant',
  ACTIVITE: 'Activite',
};

function libelleTypeVerrou(type: TypeVerrou): string {
  return LIBELLE_TYPE_VERROU[type] ?? type;
}

const DICO = DICTIONNAIRE_FR.ges.verrous as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

interface LocksManagementPageProps {
  readonly versionId?: string;
}

/** Page EC-GES-12 : Gestion des verrous (bail d'édition). */
export function LocksManagementPage({ versionId: versionIdDepuisUrl }: LocksManagementPageProps): JSX.Element {
  const [versionId, setVersionId] = useState<string | null>(
    versionIdDepuisUrl ?? null,
  );

  /*──────────────────────────────────────────────────────────────────────
    Verrous de la version
  ─────────────────────────────────────────────────────────────────────*/
  const {
    data: verrousData,
    isLoading: verrousChargement,
    refetch: refetchVerrous,
  } = useQuery({
    queryKey: ['locks', versionId],
    queryFn: () =>
      planningApi.listerVerrous({
        versionId: versionId ?? '',
        page: 1,
        pageSize: 200,
      }),
    enabled: !!versionId,
    staleTime: 30 * 1000,
  });

  const verrous: readonly Lock[] = (verrousData?.items ?? []) as Lock[];

  /*──────────────────────────────────────────────────────────────────────
    Pose de verrou
  ─────────────────────────────────────────────────────────────────────*/
  const [nouveauVerrou, setNouveauVerrou] = useState<LockCreateInput>({
    versionId: versionId ?? '',
    type: 'SALLE',
    valeur: '',
    poids: 100,
  });

  const { mutate: poserVerrou, isPending: poseEnCours } = useMutation({
    mutationFn: (donnees: LockCreateInput) => planningApi.poserVerrou(donnees),
    onSuccess: () => {
      void refetchVerrous();
      setNouveauVerrou({
        versionId: versionId ?? '',
        type: 'SALLE',
        valeur: '',
        poids: 100,
      });
    },
  });

  const { mutate: leverVerrou, isPending: levageEnCours } = useMutation({
    mutationFn: (id: string) => planningApi.leverVerrou(id),
    onSuccess: () => {
      void refetchVerrous();
    },
  });

  const gererSelectionVersion = useCallback((id: string) => {
    setVersionId(id);
    setNouveauVerrou((prec) => ({ ...prec, versionId: id }));
  }, []);

  const gererChampVerrou = useCallback((champ: keyof LockCreateInput, valeur: string | number) => {
    setNouveauVerrou((prec) => ({ ...prec, [champ]: valeur }));
  }, []);

  const gererPoseVerrou = useCallback(() => {
    if (!nouveauVerrou.valeur) return;
    void poserVerrou(nouveauVerrou);
  }, [nouveauVerrou, poserVerrou]);

  const gererLevageVerrou = useCallback((id: string) => {
    void leverVerrou(id);
  }, [leverVerrou]);

  if (verrousChargement) {
    return <EtatChargement libelle={t('chargement')} />;
  }

  if (!versionId) {
    return (
      <div style={{ padding: 'var(--space-l)' }}>
        <h1>{t('titreVerrous') ?? 'Gestion des verrous'}</h1>
        <p>{t('selectionnerVersion')}</p>
      </div>
    );
  }

  const verrousParType = useMemo(() => {
    const map = new Map<TypeVerrou, Lock[]>();
    for (const v of verrous) {
      const liste = map.get(v.type) ?? [];
      liste.push(v);
      map.set(v.type, liste);
    }
    return map;
  }, [verrous]);

  return (
    <div style={{ padding: 'var(--space-l)', display: 'flex', flexDirection: 'column', gap: 'var(--space-l)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
        <SelecteurVersion
          versionIdSelectionnee={versionId ?? undefined}
          surSelection={gererSelectionVersion}
        />
        <h1>{t('titreVerrous') ?? 'Gestion des verrous'}</h1>
        <p>{t('sousTitreVerrous') ?? 'Posez et levez des verrous sur les séances de la version.'}</p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 'var(--space-l)', alignItems: 'start' }}>
        {/* Formulaire de pose */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          <h2 style={{ fontSize: 'var(--font-size-h3)', margin: 0 }}>{t('poserVerrou') ?? 'Poser un verrou'}</h2>
          <div style={{ border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', padding: 'var(--space-s)', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
              <Select
                label={t('typeVerrou') ?? 'Type de verrou'}
                value={nouveauVerrou.type}
                options={[
                  { valeur: 'CRENEAU', libelle: 'Créneau' },
                  { valeur: 'SALLE', libelle: 'Salle' },
                  { valeur: 'ENSEIGNANT', libelle: 'Enseignant' },
                  { valeur: 'ACTIVITE', libelle: 'Activité' },
                ]}
                onChange={(v) => gererChampVerrou('type', v)}
              />
              <Input
                label={t('valeurVerrou') ?? 'Valeur (ID de la ressource)'}
                value={nouveauVerrou.valeur}
                onChange={(e) => gererChampVerrou('valeur', e)}
                placeholder="Ex: salle-123"
              />
              <Input
                type="number"
                label={t('poidsVerrou') ?? 'Poids (1-100)'}
                value={String(nouveauVerrou.poids)}
                onChange={(e) =>
                  gererChampVerrou('poids', Math.max(1, Math.min(100, Number(e || 1))))
                }
              />
            </div>
            <Bouton
              variante="primaire"
              libelle={t('boutonPoser') ?? 'Poser le verrou'}
              onClick={gererPoseVerrou}
              disabled={poseEnCours || !nouveauVerrou.valeur || !versionId}
            />
          </div>
        </aside>

        {/* Liste des verrous */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
          {verrous.length === 0 ? (
            <EtatVide
              titre={t('aucunVerrou') ?? 'Aucun verrou'}
              message={t('aucunVerrouMessage') ?? 'Aucun verrou n’est posé sur cette version.'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-s)' }}>
              {Array.from(verrousParType.entries()).map(([type, liste]) => (
                <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  <div style={{ fontSize: 'var(--font-size-caption)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    {libelleTypeVerrou(type)} ({liste.length})
                  </div>
                  <div style={{ border: `var(--border-width) solid var(--color-border)`, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
                    {liste.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: 'var(--space-s)',
                          borderBottom: `var(--border-width) solid var(--color-border)`,
                          fontSize: 'var(--font-size-body)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-s)', flex: 1, minWidth: 0 }}>
                          <span style={{ fontWeight: 600 }}>{v.seanceId.slice(0, 8)}…</span>
                          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>{v.valeur.slice(0, 8)}…</span>
                          <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)' }}>{v.poids}%</span>
                        </div>
                        <Bouton
                          variante="fantome"
                          taille="petite"
                          libelle={t('lever') ?? 'Lever'}
                          onClick={() => gererLevageVerrou(v.id)}
                          disabled={levageEnCours}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}