// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AlerteGlobale } from './AlerteGlobale';

describe('AlerteGlobale', () => {
  afterEach(() => {
    cleanup();
  });

  it('ne rend rien quand aucune notification', () => {
    render(<AlerteGlobale notifications={[]} onFermer={() => {}} />);
    expect(screen.queryByTestId('alerte-globale')).not.toBeInTheDocument();
  });

  it('affiche chaque notification comme toast avec titre et message', () => {
    const notifications = [
      {
        type: 'notification' as const,
        notificationId: '123e4567-e89b-12d3-a456-426614174000',
        titre: 'Alerte 1',
        message: 'Message 1',
      },
      {
        type: 'notification' as const,
        notificationId: '123e4567-e89b-12d3-a456-426614174001',
        titre: 'Alerte 2',
        message: 'Message 2',
      },
    ];
    render(<AlerteGlobale notifications={notifications} onFermer={() => {}} />);
    expect(screen.getByTestId('alerte-globale')).toBeInTheDocument();
    expect(screen.getByText('Alerte 1')).toBeInTheDocument();
    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Alerte 2')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
  });

  it('appelle onFermer avec l id quand on ferme un toast', () => {
    const onFermer = vi.fn();
    render(
      <AlerteGlobale
        notifications={[
          {
            type: 'notification' as const,
            notificationId: '123e4567-e89b-12d3-a456-426614174000',
            titre: 'T',
            message: 'M',
          },
        ]}
        onFermer={onFermer}
      />,
    );
    fireEvent.click(screen.getByTestId('alerte-toast-123e4567-e89b-12d3-a456-426614174000').querySelector('button')!);
    expect(onFermer).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
  });
});
