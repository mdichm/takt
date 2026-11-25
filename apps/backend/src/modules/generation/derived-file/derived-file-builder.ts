// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import {
  DerivedFile,
  DerivedLock,
  DerivedRoom,
  DerivedTeacher,
  DerivedGroup,
  DerivedSubject,
  DerivedActivity,
  DerivedConstraint,
  TimeGrid,
  DerivedMetadata,
} from '@takt/contracts';
import { zDerivedFile } from '@takt/contracts';
import { creerHashSHA256 } from '../../common/crypto/hash';
import { typeSalleVersRoomType, contrainteTypeVersDerivee } from './mapping';

/** Identifiant utilisateur système pour les métadonnées de contrainte. */
const UUID_SYSTEME = '00000000-0000-0000-0000-000000000000';

/** TypeVerrou en local pour éviter toute dépendance Prisma dans le builder. */
type TypeVerrouLocal = 'CRENEAU' | 'SALLE' | 'ENSEIGNANT' | 'ACTIVITE';

/**
 * Options d'entrée du builder. `generationId` et `createdAt` sont fournis par
 * l'appelant (le builder est pur : il n'invente aucun identifiant ni
 * horodatage, garantissant le déterminisme du fichier produit).
 */
export interface DerivedFileOptions {
  generationId: string;
  createdAt: string;
}

/**
 * Construit le fichier dérivé d'entrée du solveur à partir d'un snapshot de
 * version. Fonction pure : aucune importation Prisma, aucun accès base de
 * données, même snapshot + mêmes options ⇒ même fichier et même checksum.
 *
 * @param snapshot Données du snapshot (payload `donnees` de SnapshotService)
 * @param options  générationId et createdAt fournis par l'appelant
 * @returns { fichier, checksum } — fichier conforme au schéma Zod, checksum
 *          SHA-256 du sérialisé canonique
 */
export function buildDerivedFile(
  snapshot: unknown,
  options: DerivedFileOptions,
): { fichier: DerivedFile; checksum: string } {
  const {
    versionId,
    semestre,
    activites,
    groupes,
    enseignants,
    salles,
    creneaux,
    seances,
    contraintes,
    verrous,
  } = snapshot as Record<string, unknown>;

  // --- metadata ---
  const metadata: DerivedMetadata = {
    generationId: options.generationId,
    versionId: versionId as string,
    semestre: (semestre as { numero: number }).numero.toString(),
    createdAt: options.createdAt,
    timeSlotMinutes: 30,
    days: 6,
    slotsPerDay: 24,
  };

  // --- timeGrid ---
  const dayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const slotLabels = (creneaux as Array<{ heureDebut: string }>).map(
    (c) => c.heureDebut.slice(11, 16),
  );
  const timeGrid: TimeGrid = {
    totalSlots: 144,
    slotDurationMinutes: 30,
    dayLabels,
    slotLabels,
  };

  // --- rooms ---
  const rooms: DerivedRoom[] = (salles as Array<{
    id: string;
    code: string;
    typeSalleCode: string | null;
    capacite: number;
    siteLibelle: string | null;
    equipements: string[];
  }>).map((s) => ({
    id: s.id,
    code: s.code,
    type: typeSalleVersRoomType(s.typeSalleCode),
    capacity: s.capacite,
    building: s.siteLibelle ?? '',
    equipment: s.equipements.length > 0 ? s.equipements : undefined,
  }));

  // --- teachers ---
  const teachers: DerivedTeacher[] = (enseignants as Array<{
    id: string;
    matricule: string;
    departementIds: string[];
    chargeMaxHebdo: number | null;
  }>).map((e) => ({
    id: e.id,
    code: e.matricule,
    name: e.matricule,
    departmentId: e.departementIds[0] ?? UUID_SYSTEME,
    maxHoursPerWeek: e.chargeMaxHebdo ?? 0,
    unavailableSlots: [],
  }));

  // --- groups ---
  const groups: DerivedGroup[] = (groupes as Array<{
    id: string;
    code: string;
    effectif: number;
    departementId?: string;
  }>).map((g) => ({
    id: g.id,
    code: g.code,
    size: g.effectif ?? 1,
    departmentId: g.departementId ?? UUID_SYSTEME,
  }));

  // --- subjects (non encore portés par le snapshot ; liste vide) ---
  const subjects: DerivedSubject[] = [];

  // --- activities ---
  const activities: DerivedActivity[] = (activites as Array<{
    id: string;
    matiereId: string;
    enseignantId: string;
    groupeId: string;
    typeEnseignementCode: string | null;
    volumeHebdo: number;
    dureeCreneaux: number | null;
  }>).map((a) => {
    const pas = 30;
    const durationSlots = Math.max(1, Math.round((a.dureeCreneaux ?? pas) / pas));
    const typeEnseignementCode = (a.typeEnseignementCode ?? 'TD') as
      | 'CM'
      | 'TD'
      | 'TP'
      | 'PROJET';
    const roomType =
      typeEnseignementCode === 'CM'
        ? 'AMPHI'
        : typeEnseignementCode === 'TP'
          ? 'TP'
          : typeEnseignementCode === 'PROJET'
            ? 'INFO'
            : 'TD';
    return {
      id: a.id,
      subjectId: a.matiereId,
      teacherIds: [a.enseignantId],
      groupIds: [a.groupeId],
      roomType,
      durationSlots,
      weeklyVolume: a.volumeHebdo,
      teachingType: typeEnseignementCode,
    };
  });

  // --- locks ---
  const activiteParSeance = new Map<string, string>();
  for (const s of seances as Array<{ id: string; affectationId: string }>) {
    if (s.affectationId) activiteParSeance.set(s.id, s.affectationId);
  }

  const locks: DerivedLock[] = (verrous as Array<{
    id: string;
    seanceId: string;
    type: TypeVerrouLocal;
    valeur: string;
    poids: number;
  }>).map((v) => {
    const activiteId = activiteParSeance.get(v.seanceId) ?? '';
    return {
      id: v.id,
      activityId: activiteId,
      lockType:
        (v.type === 'CRENEAU'
          ? 'TIMESLOT'
          : v.type === 'SALLE'
            ? 'ROOM'
            : v.type === 'ENSEIGNANT'
              ? 'TEACHER'
              : 'ACTIVITY') as DerivedLock['lockType'],
      value: v.valeur,
      poids: v.poids,
    };
  });

  // --- constraints (transcodage via mapping métier) ---
  const contraintesTriees = contraintes as Array<{
    id: string;
    type: string;
    cibleId: string;
    valeur: string;
    poids: number | null;
    estActif: boolean;
  }>;
  const constraints: DerivedConstraint[] = contraintesTriees
    .filter((c) => c.estActif) // contraintes désactivées exclues du fichier dérivé
    .flatMap((c) => {
      const derivee = contrainteTypeVersDerivee(c.type);
      if (!derivee) return []; // type non reconnu : ignoré (warning dans mapping)
      return [{
        id: c.id,
        type: derivee.type,
        category: derivee.category,
        scope: derivee.scope,
        targetId: c.cibleId ?? null,
        value: c.valeur,
        weight: c.poids ?? derivee.weight, // poids contrainte ⇒ repli sur le poids canonique du type
        isActive: c.estActif,
        source: derivee.source,
        createdBy: UUID_SYSTEME,
        createdAt: options.createdAt,
      }];
    });

  const fichier: DerivedFile = {
    metadata,
    timeGrid,
    rooms,
    teachers,
    groups,
    subjects,
    activities,
    constraints,
    locks,
  };

  // Validation du schéma Zod avant écriture (GG-05)
  zDerivedFile.parse(fichier);

  const checksum = creerHashSHA256(fichier);
  return { fichier, checksum };
}
