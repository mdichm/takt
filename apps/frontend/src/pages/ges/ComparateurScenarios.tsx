// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { type JSX, useMemo } from 'react';
import { type Scenario, type Salle, type Enseignant } from '@takt/contracts';
import { Badge } from '@/components/atoms/Badge';
import { DICTIONNAIRE_FR } from '@/i18n/fr';

const DICO = DICTIONNAIRE_FR.ges.scenarios.comparateur as unknown as Record<
  string,
  string
>;

function t(cle: string): string {
  return typeof DICO[cle] === 'string' ? DICO[cle] : cle;
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function libelleJour(jour: number): string {
  return JOURS[jour] ?? `J${jour}`;
}

function libelleCreneau(slot: number): string {
  const h = Math.floor(slot / 2);
  const m = (slot % 2) * 30;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

interface PlacementAffiche {
  activiteId: string;
  jour: number;
  creneau: number;
  salleId: string;
  salleLibelle: string;
  enseignantId: string;
  enseignantLibelle: string;
  estDeplacee: boolean;
  estSalleDiff: boolean;
  estEnseignantDiff: boolean;
}

interface LigneComparaison {
  activiteId: string;
  activiteLibelle: string;
  cellules: Record<string, PlacementAffiche | null>;
}

interface ComparateurScenariosProps {
  readonly scenarios: readonly Scenario[];
  readonly salles: readonly Salle[];
  readonly enseignants: readonly Enseignant[];
  readonly salleMap: Map<string, Salle>;
  readonly enseignantMap: Map<string, Enseignant>;
}

export function ComparateurScenarios({
  scenarios,
  salles,
  enseignants,
  salleMap,
  enseignantMap,
}: ComparateurScenariosProps): JSX.Element {
  const lignes = useMemo<LigneComparaison[]>(() => {
    const activites = new Map<string, Set<string>>();
    const placementsParActivite = new Map<
      string,
      Map<string, { day: number; slot: number; roomId: string; teacherId: string }>
    >();

    for (const scenario of scenarios) {
      for (const p of scenario.placements ?? []) {
        if (!activites.has(p.activityId)) {
          activites.set(p.activityId, new Set());
          placementsParActivite.set(p.activityId, new Map());
        }
        activites.get(p.activityId)!.add(scenario.id);
        const map = placementsParActivite.get(p.activityId)!;
        map.set(scenario.id, {
          day: p.day,
          slot: p.slot,
          roomId: p.roomId,
          teacherId: p.teacherId,
        });
      }
    }

    const lignesResult: LigneComparaison[] = [];
    for (const [activiteId] of activites) {
      const cellules: Record<string, PlacementAffiche | null> = {};
      let reference:
        | { day: number; slot: number; roomId: string; teacherId: string }
        | null = null;

      for (const scenario of scenarios) {
        const placement = placementsParActivite.get(activiteId)?.get(scenario.id);
        const salle = placement ? salleMap.get(placement.roomId) : undefined;
        const enseignant = placement
          ? enseignantMap.get(placement.teacherId)
          : undefined;

        if (!reference && placement) {
          reference = placement;
        }

        cellules[scenario.id] = placement
          ? {
              activiteId,
              jour: placement.day,
              creneau: placement.slot,
              salleId: placement.roomId,
              salleLibelle: salle?.libelle ?? placement.roomId.slice(0, 8),
              enseignantId: placement.teacherId,
              enseignantLibelle: enseignant
                ? `${enseignant.prenom} ${enseignant.nom}`
                : placement.teacherId.slice(0, 8),
              estDeplacee: false,
              estSalleDiff: false,
              estEnseignantDiff: false,
            }
          : null;
      }

      if (reference) {
        for (const scenario of scenarios) {
          const c = cellules[scenario.id];
          if (!c) continue;
          const p = placementsParActivite.get(activiteId)?.get(scenario.id);
          if (!p) continue;
          if (p.day !== reference.day || p.slot !== reference.slot) {
            c.estDeplacee = true;
          }
          if (p.roomId !== reference.roomId) {
            c.estSalleDiff = true;
          }
          if (p.teacherId !== reference.teacherId) {
            c.estEnseignantDiff = true;
          }
        }
      }

      lignesResult.push({
        activiteId,
        activiteLibelle: activiteId.slice(0, 8),
        cellules,
      });
    }

    return lignesResult;
  }, [scenarios, salles, enseignants, salleMap, enseignantMap]);

  if (lignes.length === 0) {
    return (
      <div style={{ padding: 'var(--space-m)', color: 'var(--color-text-secondary)' }}>
        {t('vide') ?? 'Aucun placement à comparer.'}
      </div>
    );
  }

  return (
    <section style={{ marginTop: 'var(--space-m)' }}>
      <table
        role="grid"
        aria-label={t('titre') ?? 'Comparaison détaillée des placements'}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--font-size-body-small)',
        }}
      >
        <thead>
          <tr role="row">
            <th scope="col" role="columnheader" style={STYLE_TH}>
              {t('activite') ?? 'Activité'}
            </th>
            {scenarios.map((s) => (
              <th
                key={s.id}
                scope="col"
                role="columnheader"
                style={STYLE_TH}
                title={`Score ${s.scoreGlobal} / 100`}
              >
                {s.id.slice(0, 8)}…
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne) => (
            <tr key={ligne.activiteId} role="row" style={STYLE_TR}>
              <td role="gridcell" style={STYLE_TD}>
                {ligne.activiteLibelle}
              </td>
              {scenarios.map((s) => {
                const cellule = ligne.cellules[s.id];
                const fondCellule = cellule?.estDeplacee
                  ? 'var(--color-surface-erreur)'
                  : cellule?.estSalleDiff
                    ? 'var(--color-surface-attention)'
                    : 'var(--color-surface)';
                return (
                  <td
                    key={s.id}
                    role="gridcell"
                    style={{ ...STYLE_TD, background: fondCellule }}
                    title={
                      cellule
                        ? [
                          `${libelleJour(cellule.jour)} ${libelleCreneau(cellule.creneau)}`,
                          cellule.salleLibelle,
                          cellule.enseignantLibelle,
                        ].join(' · ')
                        : 'Non placée'
                    }
                  >
                    {cellule ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-xxs)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {libelleJour(cellule.jour)} {libelleCreneau(
                            cellule.creneau,
                          )}
                        </span>
                        <span
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {cellule.salleLibelle}
                        </span>
                        <span
                          style={{
                            fontSize: 'var(--font-size-caption)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {cellule.enseignantLibelle}
                        </span>
                        {cellule.estDeplacee && (
                          <Badge
                            variante="attention"
                            libelle={t('deplacee') ?? 'Déplacée'}
                            className="badge-deplacee"
                          />
                        )}
                        {cellule.estSalleDiff && (
                          <Badge
                            variante="attention"
                            libelle={t('salleDiff') ?? 'Salle différente'}
                            className="badge-salle-diff"
                          />
                        )}
                        {cellule.estEnseignantDiff && (
                          <Badge
                            variante="attention"
                            libelle={t('enseignantDiff') ?? 'Enseignant différent'}
                            className="badge-enseignant-diff"
                          />
                        )}
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: 'var(--font-size-caption)',
                          color: 'var(--color-text-secondary)',
                          fontStyle: 'italic',
                        }}
                      >
                        —
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const STYLE_TH: React.CSSProperties = {
  textAlign: 'left',
  padding: '0 var(--space-m)',
  fontSize: 'var(--font-size-body-small)',
  fontWeight: 600,
  color: 'var(--color-text-primary)',
  borderBottom: 'var(--border-width) solid var(--color-divider)',
  background: 'var(--color-surface)',
};

const STYLE_TR: React.CSSProperties = {
  borderBottom: 'var(--border-width) solid var(--color-divider)',
};

const STYLE_TD: React.CSSProperties = {
  textAlign: 'left',
  padding: '0 var(--space-m)',
  fontSize: 'var(--font-size-body-small)',
  color: 'var(--color-text-primary)',
  borderRight: 'var(--border-width) solid var(--color-divider)',
  verticalAlign: 'top',
};