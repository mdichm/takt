// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect } from 'vitest';
import {
  construireGrille,
  occupationsCellule,
  estCelluleVerrouillee,
  verrouBloquantSurSeance,
  libelleTypeVerrou,
  estBailExpire,
  estBailProcheExpiration,
  secondesRestantesBail,
  formaterCompteARebours,
  estConflitBloquant,
  filtrerConflitsBloquants,
  libelleTypeConflit,
  seancesRestantesParAffectation,
  trierAlternatives,
} from './edt';
import {
  type Creneau,
  type Seance,
  type Lock,
  type Conflit,
  type AlternativePlacement,
} from '@takt/contracts';

function creerCreneau(overrides: Partial<Creneau> = {}): Creneau {
  return {
    id: 'creneau-1',
    jour: 1,
    ordre: 1,
    heureDebut: '2026-01-01T08:00:00Z',
    heureFin: '2026-01-01T08:50:00Z',
    dureeMinutes: 50,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function creerSeance(overrides: Partial<Seance> = {}): Seance {
  return {
    id: 'seance-1',
    versionId: 'v-1',
    jour: 1,
    creneauDebutId: 'creneau-1',
    nbCreneaux: 1,
    salleId: null,
    enseignantId: null,
    groupeId: null,
    matiereId: null,
    typeEnseignementId: null,
    affectationId: 'aff-1',
    estVerrouillee: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    creneauDebut: creerCreneau(),
    salle: null,
    enseignant: null,
    groupe: null,
    matiere: null,
    typeEnseignement: null,
    affectation: {
      id: 'aff-1',
      versionId: 'v-1',
      semestreId: 's-1',
      departementId: 'd-1',
      enseignantId: 'ens-1',
      matiereId: 'mat-1',
      groupeId: 'grp-1',
      typeEnseignementId: null,
      volumeHebdo: 90,
      dureeCreneaux: 50,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    verrous: [],
    ...overrides,
  };
}

function creerLock(overrides: Partial<Lock> = {}): Lock {
  return {
    id: 'lock-1',
    versionId: 'v-1',
    seanceId: 'seance-1',
    utilisateurId: 'user-1',
    type: 'SALLE',
    valeur: 'salle-1',
    poids: 100,
    datePose: '2026-01-01T08:00:00Z',
    ...overrides,
  };
}

function creerConflit(overrides: Partial<Conflit> = {}): Conflit {
  return {
    type: 'SALLE',
    severite: 'BLOQUANT',
    message: 'Conflit de salle',
    details: {},
    ...overrides,
  };
}

describe('construireGrille', () => {
  it('regroupe les seances par cellule jour x creneau', () => {
    const creneaux = [
      creerCreneau({ id: 'c1', ordre: 1 }),
      creerCreneau({ id: 'c2', ordre: 2, jour: 2 }),
    ];
    const seances = [
      creerSeance({ id: 's1', jour: 1, creneauDebutId: 'c1' }),
      creerSeance({ id: 's2', jour: 1, creneauDebutId: 'c1' }),
      creerSeance({ id: 's3', jour: 2, creneauDebutId: 'c2' }),
    ];
    const grille = construireGrille(creneaux, seances);
    expect(grille).toHaveLength(2);
    const c1 = grille.find((c) => c.creneauDebutId === 'c1');
    expect(c1?.seances).toHaveLength(2);
    const c2 = grille.find((c) => c.creneauDebutId === 'c2');
    expect(c2?.seances).toHaveLength(1);
  });

  it('trie par jour puis ordre de creneau', () => {
    const creneaux = [
      creerCreneau({ id: 'c2', jour: 2, ordre: 1 }),
      creerCreneau({ id: 'c1', jour: 1, ordre: 2 }),
    ];
    const seances = [
      creerSeance({ id: 's1', jour: 2, creneauDebutId: 'c2' }),
      creerSeance({ id: 's2', jour: 1, creneauDebutId: 'c1' }),
    ];
    const grille = construireGrille(creneaux, seances);
    expect(grille[0]!.jour).toBe(1);
    expect(grille[1]!.jour).toBe(2);
  });

  it('ignore les seances dont le creneau est introuvable', () => {
    const creneaux = [creerCreneau({ id: 'c1' })];
    const seances = [creerSeance({ creneauDebutId: 'c-inconnu' })];
    expect(construireGrille(creneaux, seances)).toHaveLength(0);
  });
});

describe('occupationsCellule', () => {
  it('retourne les seances d une cellule', () => {
    const grille = construireGrille(
      [creerCreneau({ id: 'c1' })],
      [
        creerSeance({ id: 's1', creneauDebutId: 'c1' }),
        creerSeance({ id: 's2', creneauDebutId: 'c1' }),
      ],
    );
    expect(occupationsCellule(grille, 1, 'c1')).toHaveLength(2);
    expect(occupationsCellule(grille, 2, 'c1')).toHaveLength(0);
  });
});

describe('estCelluleVerrouillee', () => {
  it('retourne true si une seance de la cellule a un verrou', () => {
    const grille = construireGrille(
      [creerCreneau({ id: 'c1' })],
      [creerSeance({ id: 's1', creneauDebutId: 'c1', verrous: [creerLock()] })],
    );
    expect(estCelluleVerrouillee(grille, 1, 'c1')).toBe(true);
  });

  it('retourne false si aucune seance de la cellule n a de verrou', () => {
    const grille = construireGrille(
      [creerCreneau({ id: 'c1' })],
      [creerSeance({ id: 's1' })],
    );
    expect(estCelluleVerrouillee(grille, 1, 'c1')).toBe(false);
  });
});

describe('verrouBloquantSurSeance', () => {
  it('retourne le verrou si pose par un autre utilisateur', () => {
    const seance = creerSeance({
      verrous: [creerLock({ utilisateurId: 'user-autre' })],
    });
    const v = verrouBloquantSurSeance(seance, 'user-1');
    expect(v?.id).toBe('lock-1');
  });

  it('retourne null si le verrou est pose par l utilisateur connecte', () => {
    const seance = creerSeance({
      verrous: [creerLock({ utilisateurId: 'user-1' })],
    });
    expect(verrouBloquantSurSeance(seance, 'user-1')).toBeNull();
  });

  it('retourne null si la seance n a aucun verrou', () => {
    expect(verrouBloquantSurSeance(creerSeance(), 'user-1')).toBeNull();
  });
});

describe('libelleTypeVerrou', () => {
  it('traduit les types connus', () => {
    expect(libelleTypeVerrou('SALLE')).toBe('Salle');
    expect(libelleTypeVerrou('ENSEIGNANT')).toBe('Enseignant');
    expect(libelleTypeVerrou('CRENEAU')).toBe('Creneau');
    expect(libelleTypeVerrou('ACTIVITE')).toBe('Activite');
  });

  it('retourne le type brut si inconnu', () => {
    expect(libelleTypeVerrou('INCONNU')).toBe('INCONNU');
  });
});
describe('estBailExpire', () => {
  it('retourne true si la date de fin est passee', () => {
    expect(estBailExpire({ dateFin: '2026-01-01T08:00:00Z' }, maintenant)).toBe(true);
  });

  it('retourne false si la date de fin est dans le futur', () => {
    expect(estBailExpire({ dateFin: '2026-01-01T10:00:00Z' }, maintenant)).toBe(false);
  });

  it('retourne true si la date de fin est exactement maintenant', () => {
    expect(estBailExpire({ dateFin: '2026-01-01T09:00:00Z' }, maintenant)).toBe(true);
  });
});

describe('estBailProcheExpiration', () => {
  it('retourne true si le bail expire dans le seuil', () => {
    expect(
      estBailProcheExpiration(
        { dateFin: '2026-01-01T09:03:00Z' },
        maintenant,
        5 * 60 * 1000,
      ),
    ).toBe(true);
  });

  it('retourne false si le bail expire apres le seuil', () => {
    expect(
      estBailProcheExpiration(
        { dateFin: '2026-01-01T09:10:00Z' },
        maintenant,
        5 * 60 * 1000,
      ),
    ).toBe(false);
  });
});

describe('secondesRestantesBail', () => {
  it('retourne le nombre de secondes restantes', () => {
    expect(secondesRestantesBail({ dateFin: '2026-01-01T09:05:00Z' }, maintenant)).toBe(300);
  });

  it('retourne 0 si le bail est expire', () => {
    expect(secondesRestantesBail({ dateFin: '2026-01-01T08:00:00Z' }, maintenant)).toBe(0);
  });
});

describe('formaterCompteARebours', () => {
  it('formate en MM:SS', () => {
    expect(formaterCompteARebours({ dateFin: '2026-01-01T09:05:30Z' }, maintenant)).toBe('05:30');
  });

  it('formate 00:00 si expire', () => {
    expect(formaterCompteARebours({ dateFin: '2026-01-01T08:00:00Z' }, maintenant)).toBe('00:00');
  });
});
describe('estConflitBloquant', () => {
  it('retourne true si au moins un conflit est bloquant', () => {
    expect(
      estConflitBloquant([
        creerConflit({ severite: 'AVERTISSEMENT' }),
        creerConflit({ severite: 'BLOQUANT' }),
      ]),
    ).toBe(true);
  });

  it('retourne false si aucun conflit bloquant', () => {
    expect(
      estConflitBloquant([
        creerConflit({ severite: 'AVERTISSEMENT' }),
        creerConflit({ severite: 'INFORMATION' }),
      ]),
    ).toBe(false);
  });

  it('retourne false pour une liste vide', () => {
    expect(estConflitBloquant([])).toBe(false);
  });
});

describe('filtrerConflitsBloquants', () => {
  it('ne garde que les conflits bloquants', () => {
    const conflits = [
      creerConflit({ severite: 'AVERTISSEMENT' }),
      creerConflit({ severite: 'BLOQUANT' }),
      creerConflit({ severite: 'BLOQUANT' }),
    ];
    expect(filtrerConflitsBloquants(conflits)).toHaveLength(2);
  });
});

describe('libelleTypeConflit', () => {
  it('traduit les types connus', () => {
    expect(libelleTypeConflit('SALLE')).toBe('Salle');
    expect(libelleTypeConflit('ENSEIGNANT')).toBe('Enseignant');
    expect(libelleTypeConflit('VERROU')).toBe('Verrou');
  });
});

describe('seancesRestantesParAffectation', () => {
  it('calcule le nombre de creneaux restants', () => {
    expect(seancesRestantesParAffectation(90, 0, 50)).toBe(2);
    expect(seancesRestantesParAffectation(100, 50, 50)).toBe(1);
    expect(seancesRestantesParAffectation(90, 90, 50)).toBe(0);
    expect(seancesRestantesParAffectation(90, 100, 50)).toBe(0);
  });

  it('retourne 0 si la duree de creneau est invalide', () => {
    expect(seancesRestantesParAffectation(90, 0, 0)).toBe(0);
  });
});

describe('trierAlternatives', () => {
  it('trie par score decroissant', () => {
    const alt = [
      { score: 50, sousScores: { continuite: 10 } },
      { score: 90, sousScores: { continuite: 5 } },
      { score: 70, sousScores: { continuite: 20 } },
    ];
    const trie = trierAlternatives(alt as unknown as readonly AlternativePlacement[]);
    expect(trie[0]!.score).toBe(90);
    expect(trie[1]!.score).toBe(70);
    expect(trie[2]!.score).toBe(50);
  });

  it('brise l egalite par le score de continuite', () => {
    const alt = [
      { score: 80, sousScores: { continuite: 30 } },
      { score: 80, sousScores: { continuite: 90 } },
    ];
    const trie = trierAlternatives(alt as unknown as readonly AlternativePlacement[]);
    expect(trie[0]!.sousScores.continuite).toBe(90);
    expect(trie[1]!.sousScores.continuite).toBe(30);
  });
});
const maintenant = new Date('2026-01-01T09:00:00Z');