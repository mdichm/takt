// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Alerte } from '@/components/atoms/Alerte';
import { Spinner } from '@/components/atoms/Spinner';
import { DICTIONNAIRE_FR } from '@/i18n/fr';
import {
  planningApi,
  type Seance,
  type Bail,
  type Lock,
} from '@/lib/planning.api';
import {
  CelluleGrille,
  estCelluleVerrouillee,
  verrouBloquantSurSeance,
} from '@/lib/ges/edt';
import { ConflitModal } from './ConflitModal';
import { VerrouBadge } from './VerrouBadge';
import { type Creneau, type Conflit } from '@takt/contracts';

const DICO = DICTIONNAIRE_FR.ges.edt as unknown as Record<string, string>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

interface GrilleEDTProps {
  readonly cellules: readonly CelluleGrille[];
  readonly creneaux: readonly Creneau[];
  readonly versionId: string;
  readonly utilisateurId: string;
  readonly bail: Bail | null;
  readonly verrous: readonly Lock[];
  readonly chargement: boolean;
  readonly estBailValide: boolean;
  readonly onSeanceDeplacee: () => void;
  readonly onConflitDetecte: (conflits: readonly Conflit[]) => void;
}

type DroppableReturn = {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown>;
  setNodeRef: (node: HTMLElement | null) => void;
  isOver: boolean;
};

/** Carte de séance draggable. */
function CarteSeance({
  seance,
  utilisateurId,
}: {
  readonly seance: Seance;
  readonly utilisateurId: string;
}): JSX.Element {
  const verrouBloquant = verrouBloquantSurSeance(seance, utilisateurId);
  const libelleMatiere =
    seance.matiere?.libelle ?? seance.matiereId ?? t('matiereNonDefinie');
  const libelleEnseignant =
    seance.enseignant?.nom ?? seance.enseignantId ?? t('enseignantNonDefinie');
  const libelleSalle =
    seance.salle?.libelle ?? seance.salleId ?? t('salleNonDefinie');
  const estVerrouillee = verrouBloquant !== null;

  return (
    <div
      style={{
        padding: 'var(--space-xs)',
        borderRadius: 'var(--radius-md)',
        background: estVerrouillee
          ? 'var(--color-error)'
          : 'var(--color-surface)',
        border: `var(--border-width) solid ${
          estVerrouillee ? 'var(--color-error)' : 'var(--color-border)'
        }`,
        color: estVerrouillee
          ? 'var(--color-surface)'
          : 'var(--color-text-primary)',
        fontSize: 'var(--font-size-body)',
        cursor: estVerrouillee ? 'not-allowed' : 'grab',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-caption)' }}>
        {libelleMatiere}
      </div>
      <div style={{ fontSize: 'var(--font-size-caption)', opacity: 0.85 }}>
        {libelleEnseignant} • {libelleSalle}
      </div>
      {estVerrouillee && (
        <VerrouBadge
          verrou={verrouBloquant!}
          utilisateurConnecteId={utilisateurId}
        />
      )}
    </div>
  );
}
/** Cellule de la grille (Droppable) recevant les séances déposées. */
function CelluleGrilleComposant({
  cellule,
  cellulesToutes,
  utilisateurId,
  estBailValide,
  chargement,
}: {
  readonly cellule: CelluleGrille;
  readonly cellulesToutes: readonly CelluleGrille[];
  readonly utilisateurId: string;
  readonly estBailValide: boolean;
  readonly chargement: boolean;
}): JSX.Element {
  const drop = useDroppable({
    id: `${cellule.jour}:${cellule.creneauDebutId}`,
    data: {
      jour: cellule.jour,
      creneauDebutId: cellule.creneauDebutId,
    },
  }) as unknown as DroppableReturn;
  const { attributes, listeners, setNodeRef, isOver } = drop;

  const estVerrouillee = estCelluleVerrouillee(
    cellulesToutes,
    cellule.jour,
    cellule.creneauDebutId,
  );

  return (
    <div
      ref={setNodeRef}
      {...(attributes as Record<string, string>)}
      {...(listeners as Record<string, unknown>)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        padding: 'var(--space-s)',
        minHeight: '80px',
        border: `var(--border-width) solid ${
          isOver
            ? 'var(--color-primary)'
            : estVerrouillee
              ? 'var(--color-error)'
              : 'var(--color-border)'
        }`,
        borderRadius: 'var(--radius-md)',
        background: isOver
          ? 'var(--color-primary-light)'
          : estVerrouillee
            ? 'var(--color-error-light)'
            : 'var(--color-surface)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--font-size-caption)',
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        J{cellule.jour} • C{cellule.creneau.ordre}
      </div>
      {chargement && <Spinner taille={24} />}
      {cellule.seances.map((s) => (
        <div key={s.id}>
          <CarteSeance seance={s} utilisateurId={utilisateurId} />
        </div>
      ))}
      {cellule.seances.length === 0 && !chargement && (
        <div
          style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-text-tertiary)',
            height: '24px',
          }}
        />
      )}
      {!estBailValide && (
        <div
          style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic',
          }}
        >
          {t('bailInactif') ?? 'Bail d’édition inactif'}
        </div>
      )}
    </div>
  );
}
/**
 * Grille EDT interactive avec drag & drop (@dnd-kit).
 * Gère les verrous, la détection de conflits et le bail d'édition.
 */
export function GrilleEDT({
  cellules,
  creneaux,
  versionId,
  utilisateurId,
  chargement,
  estBailValide,
  onSeanceDeplacee,
}: GrilleEDTProps): JSX.Element {
  const [cellulesLocales, setCellulesLocales] = useState<CelluleGrille[]>(
    Array.from(cellules),
  );
  const [seanceDeplacee, setSeanceDeplacee] = useState<{
    seance: Seance;
    celluleSourceId: string;
  } | null>(null);
  const [conflitsDrop, setConflitsDrop] = useState<readonly Conflit[] | null>(
    null,
  );
  const [conflitModalOuvert, setConflitModalOuvert] = useState(false);
  const [deplacementEnCours, setDeplacementEnCours] = useState(false);

  const idCelluleDe = useRef<string | null>(null);

  useMemo(() => {
    setCellulesLocales(Array.from(cellules));
  }, [cellules]);

  const gererDragStart = useCallback(
    (event: DragStartEvent) => {
      const seanceId = String(event.active.id).replace(/^seance-/, '');
      const seance = cellulesLocales.flatMap((c) => c.seances).find(
        (s) => s.id === seanceId,
      );
      if (!seance) return;
      const celluleSourceId = `${seance.jour}:${seance.creneauDebutId}`;
      idCelluleDe.current = celluleSourceId;
      setSeanceDeplacee({ seance, celluleSourceId });
      setConflitsDrop(null);
    },
    [cellulesLocales],
  );
  const gererDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const seanceId = String(active.id).replace(/^seance-/, '');
      const seance = cellulesLocales.flatMap((c) => c.seances).find(
        (s) => s.id === seanceId,
      );
      if (!seance) {
        setSeanceDeplacee(null);
        idCelluleDe.current = null;
        return;
      }

      setDeplacementEnCours(true);

      if (!over) {
        setSeanceDeplacee(null);
        idCelluleDe.current = null;
        setDeplacementEnCours(false);
        return;
      }

      const cibleId = String(over.id);
      const parties = cibleId.split(':');
      const cibleJour = Number(parties[0]);
      const cibleCreneauIdStr = parties[1] ?? '';

      if (cibleId === idCelluleDe.current) {
        setSeanceDeplacee(null);
        idCelluleDe.current = null;
        setDeplacementEnCours(false);
        return;
      }

      const verrouSurSeance = verrouBloquantSurSeance(seance, utilisateurId);
      if (verrouSurSeance) {
        setConflitsDrop([{ ...verrouSurSeance } as unknown as Conflit]);
        setConflitModalOuvert(true);
        setSeanceDeplacee(null);
        idCelluleDe.current = null;
        setDeplacementEnCours(false);
        return;
      }

      const celluleCible = cellulesLocales.find(
        (c) => `${c.jour}:${c.creneauDebutId}` === cibleId,
      );
      if (
        celluleCible &&
        celluleCible.seances.some((s) => s.verrous.length > 0)
      ) {
        setConflitModalOuvert(true);
        setSeanceDeplacee(null);
        idCelluleDe.current = null;
        setDeplacementEnCours(false);
        return;
      }
      try {
        const conflits: { conflits: readonly Conflit[]; bloquant: boolean } =
          await planningApi.detecterConflits(versionId, {
            jour: cibleJour,
            creneauDebutId: cibleCreneauIdStr,
            nbCreneaux: seance.nbCreneaux,
            salleId: seance.salleId ?? undefined,
            enseignantId: seance.enseignantId ?? undefined,
            groupeId: seance.groupeId ?? undefined,
          });

        if (conflits.conflits.some((c) => c.severite === 'BLOQUANT')) {
          setConflitsDrop(conflits.conflits);
          setConflitModalOuvert(true);
          setSeanceDeplacee(null);
          idCelluleDe.current = null;
          setDeplacementEnCours(false);
          return;
        }

        const cleSource = idCelluleDe.current ?? '';
        setCellulesLocales((prec) =>
          prec.map((c) => {
            const cle = `${c.jour}:${c.creneauDebutId}`;
            if (cle === cleSource) {
              return {
                ...c,
                seances: c.seances.filter((s) => s.id !== seanceId),
              };
            }
            if (cle === cibleId) {
              return {
                ...c,
                seances: [...c.seances, seance],
              };
            }
            return c;
          }),
        );

        await planningApi.deplacerSeance(seance.id, {
          jour: cibleJour,
          creneauDebutId: cibleCreneauIdStr,
        });

        void onSeanceDeplacee();
      } catch {
        // Revert implicite
      } finally {
        setSeanceDeplacee(null);
        idCelluleDe.current = null;
        setConflitsDrop(null);
        setDeplacementEnCours(false);
      }
    },
    [cellulesLocales, versionId, utilisateurId, onSeanceDeplacee],
  );
  const confirmerDeplacementMalgreConflits = useCallback(() => {
    setConflitModalOuvert(false);
    setConflitsDrop(null);
    setSeanceDeplacee(null);
    idCelluleDe.current = null;
    setDeplacementEnCours(false);
  }, []);

  const annulerDeplacement = useCallback(() => {
    setConflitModalOuvert(false);
    setConflitsDrop(null);
    setSeanceDeplacee(null);
    idCelluleDe.current = null;
    setDeplacementEnCours(false);
  }, []);

  const joursAvecCreneaux = useMemo(() => {
    const jours = new Set<number>();
    const creneauxParJour = new Map<number, Creneau[]>();
    for (const c of creneaux) {
      jours.add(c.jour);
      const liste = creneauxParJour.get(c.jour) ?? [];
      liste.push(c);
      creneauxParJour.set(c.jour, liste);
    }
    return Array.from(jours)
      .sort((a, b) => a - b)
      .map((j) => ({
        jour: j,
        creneaux: (creneauxParJour.get(j) ?? []).sort(
          (a, b) => a.ordre - b.ordre,
        ),
      }));
  }, [creneaux]);

  const draggedNode = seanceDeplacee
    ? cellulesLocales
        .flatMap((c) => c.seances)
        .find((s) => s.id === seanceDeplacee.seance.id)
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-m)',
        height: '100%',
      }}
    >
      {chargement && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 'var(--space-l)',
          }}
        >
          <Spinner taille={48} />
        </div>
      )}

      {!estBailValide && (
        <Alerte
          variante="attention"
          titre={t('bailRequis') ?? 'Bail d’édition requis'}
          message={
            t('bailRequisMessage') ??
            "Acquérez le bail d’édition avant de modifier la grille."
          }
          fermable
        />
      )}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={gererDragStart}
        onDragEnd={gererDragEnd}
      >
        <div style={{ display: 'grid', gap: 'var(--space-s)' }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-caption)' }} />
          {joursAvecCreneaux.map((j) =>
            j.creneaux.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: 'var(--space-s)',
                  fontSize: 'var(--font-size-caption)',
                  color: 'var(--color-text-secondary)',
                  textAlign: 'center',
                  borderBottom: `var(--border-width) solid var(--color-border)`,
                }}
              >
                {String(c.heureDebut).slice(11, 16)}–{String(
                  c.heureFin,
                ).slice(11, 16)}
              </div>
            )),
          )}
          {joursAvecCreneaux.map((j) => (
            <div key={j.jour} style={{ display: 'contents' }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 'var(--font-size-caption)',
                  padding: 'var(--space-s)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Jour {j.jour}
              </div>
              {j.creneaux.map((c) => {
                const cellule = cellulesLocales.find(
                  (cl) => cl.jour === j.jour && cl.creneauDebutId === c.id,
                );
                return (
                  <CelluleGrilleComposant
                    key={c.id}
                    cellule={
                      cellule ?? {
                        jour: j.jour,
                        creneauDebutId: c.id,
                        creneau: c,
                        seances: [],
                      }
                    }
                    cellulesToutes={cellulesLocales}
                    utilisateurId={utilisateurId}
                    estBailValide={estBailValide}
                    chargement={chargement}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {seanceDeplacee && draggedNode && (
          <DragOverlay>
            <div
              style={{
                ...CSS.Translate,
                padding: 'var(--space-xs)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                border: `var(--border-width) solid var(--color-primary)`,
                boxShadow: 'var(--shadow-lg)',
                width: '180px',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 'var(--font-size-caption)' }}>
                {draggedNode.matiere?.libelle ?? draggedNode.matiereId ?? ''}
              </div>
              <div style={{ fontSize: 'var(--font-size-caption)', opacity: 0.85 }}>
                {draggedNode.enseignant?.nom ?? draggedNode.enseignantId ?? ''}
              </div>
            </div>
          </DragOverlay>
        )}
      </DndContext>
      <ConflitModal
        ouvert={conflitModalOuvert}
        onFermer={annulerDeplacement}
        conflits={conflitsDrop ?? []}
        onConfirmer={confirmerDeplacementMalgreConflits}
        chargement={deplacementEnCours}
      />
    </div>
  );
}
