// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Badge } from '@/components/atoms/Badge';
import { type Lock, type TypeVerrou } from '@takt/contracts';

const LIBELLE_TYPE_VERROU: Record<TypeVerrou, string> = {
  CRENEAU: 'Creneau',
  SALLE: 'Salle',
  ENSEIGNANT: 'Enseignant',
  ACTIVITE: 'Activite',
};

function libelleTypeVerrou(type: TypeVerrou): string {
  return LIBELLE_TYPE_VERROU[type] ?? type;
}

interface VerrouBadgeProps {
  readonly verrou: Lock;
  readonly utilisateurConnecteId: string;
}

/** Badge affichant le type de verrou et si le detenteur est l utilisateur connecte. */
export function VerrouBadge({
  verrou,
  utilisateurConnecteId,
}: VerrouBadgeProps): JSX.Element {
  const estMoi = verrou.utilisateurId === utilisateurConnecteId;
  return (
    <Badge
      variante={estMoi ? 'succès' : 'erreur'}
      libelle={
        `${libelleTypeVerrou(verrou.type)}` +
        (estMoi ? ' (vous)' : ` (${verrou.utilisateurId.slice(0, 4)}…)`)
      }
    />
  );
}