// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TimelineWorkflow } from './TimelineWorkflow';

describe('TimelineWorkflow', () => {
  const etapes = [
    {
      id: 'e1',
      libelle: 'Saisie des contraintes',
      statut: 'terminé' as const,
      date: 'Lundi',
      description: 'Contraintes saisies et validées',
    },
    {
      id: 'e2',
      libelle: 'Génération',
      statut: 'en cours' as const,
      date: 'Mardi',
      description: 'Génération en cours…',
    },
    { id: 'e3', libelle: 'Revue', statut: 'à faire' as const, date: 'Mercredi' },
  ];

  it('rend le titre et toutes les étapes', () => {
    render(<TimelineWorkflow titre="Workflow de génération" etapes={etapes} />);
    expect(screen.getByText('Workflow de génération')).toBeInTheDocument();
    expect(screen.getByText('Saisie des contraintes')).toBeInTheDocument();
    expect(screen.getByText('Génération')).toBeInTheDocument();
    expect(screen.getByText('Revue')).toBeInTheDocument();
  });

  it('affiche le statut de chaque étape avec badge', () => {
    render(<TimelineWorkflow titre="Workflow" etapes={etapes} />);
    expect(screen.getByText('terminé')).toBeInTheDocument();
    expect(screen.getByText('en cours')).toBeInTheDocument();
    expect(screen.getByText('à faire')).toBeInTheDocument();
  });

  it('affiche la date quand fournie', () => {
    render(<TimelineWorkflow titre="Workflow" etapes={etapes} />);
    expect(screen.getByText('Lundi')).toBeInTheDocument();
  });

  it('affiche la description quand fournie', () => {
    render(<TimelineWorkflow titre="Workflow" etapes={etapes} />);
    expect(screen.getByText('Contraintes saisies et validées')).toBeInTheDocument();
  });
});
