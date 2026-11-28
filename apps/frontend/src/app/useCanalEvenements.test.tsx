// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import {
  useCanalEvenements,
  CanalEvenementsProvider,
  type EvenementNotification,
  type EvenementGeneration,
} from './useCanalEvenements';

// Mock EventSource (non disponible dans jsdom)
const mockEventSource = {
  close: vi.fn(),
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
};
vi.stubGlobal(
  'EventSource',
  vi.fn(() => {
    mockEventSource.close.mockClear();
    mockEventSource.onmessage = null;
    mockEventSource.onerror = null;
    return mockEventSource;
  }) as unknown as typeof EventSource,
);

function ComponentTesteur(): JSX.Element {
  const canal = useCanalEvenements();
  return (
    <div data-testid="canal-evenements">
      {canal.notifications.length > 0 ? 'avec-notifications' : 'sans-notifications'}
    </div>
  );
}

describe('useCanalEvenements', () => {
  const evenementNotification: EvenementNotification = {
    type: 'notification',
    notificationId: '123e4567-e89b-12d3-a456-426614174000',
    titre: 'Test',
    message: 'Message de test',
  };

  beforeEach(() => {
    cleanup();
    vi.stubGlobal(
      'EventSource',
      vi.fn(() => {
        mockEventSource.close.mockClear();
        mockEventSource.onmessage = null;
        mockEventSource.onerror = null;
        return mockEventSource;
      }) as unknown as typeof EventSource,
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('ne se connecte pas sans jeton', () => {
    const eventSourceSpy = vi.spyOn(window, 'EventSource');
    render(
      <CanalEvenementsProvider actif={false} jeton={null} onNotification={() => {}}>
        <ComponentTesteur />
      </CanalEvenementsProvider>,
    );
    expect(eventSourceSpy).not.toHaveBeenCalled();
  });

  it('monte sans erreur quand le canal est active', () => {
    render(
      <CanalEvenementsProvider actif={true} jeton="test-token" onNotification={() => {}}>
        <ComponentTesteur />
      </CanalEvenementsProvider>,
    );
    expect(screen.getByTestId('canal-evenements')).toHaveTextContent('sans-notifications');
    expect(mockEventSource.close).not.toHaveBeenCalled();
  });

  it('traite une notification valide reçue par SSE', () => {
    const onNotification = vi.fn();
    render(
      <CanalEvenementsProvider
        actif={true}
        jeton="test-token"
        onNotification={onNotification}
      >
        <ComponentTesteur />
      </CanalEvenementsProvider>,
    );

    // Simuler un message SSE valide
    if (mockEventSource.onmessage) {
      mockEventSource.onmessage({
        data: JSON.stringify(evenementNotification),
      } as unknown as MessageEvent);
    }

    expect(onNotification).toHaveBeenCalledWith(evenementNotification);
  });

  it('ignore un payload SSE invalide', () => {
    const onNotification = vi.fn();
    render(
      <CanalEvenementsProvider
        actif={true}
        jeton="test-token"
        onNotification={onNotification}
      >
        <ComponentTesteur />
      </CanalEvenementsProvider>,
    );

    if (mockEventSource.onmessage) {
      mockEventSource.onmessage({
        data: 'invalide',
      } as unknown as MessageEvent);
    }

    expect(onNotification).not.toHaveBeenCalled();
  });

  it('ferme le canal a la deconnexion', () => {
    const { unmount } = render(
      <CanalEvenementsProvider actif={true} jeton="test-token" onNotification={() => {}}>
        <ComponentTesteur />
      </CanalEvenementsProvider>,
    );
    unmount();
    expect(mockEventSource.close).toHaveBeenCalled();
  });
});

describe('EvenementNotification type', () => {
  it('a la structure attendue', () => {
    const n: EvenementNotification = {
      type: 'notification',
      notificationId: '123e4567-e89b-12d3-a456-426614174000',
      titre: 'Alerte',
      message: 'Quelque chose est arrive',
    };
    expect(n.type).toBe('notification');
    expect(n.notificationId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(n.titre).toBe('Alerte');
    expect(n.message).toBe('Quelque chose est arrive');
  });
});

describe('EvenementGeneration type', () => {
  it('a la structure attendue pour progression', () => {
    const e: EvenementGeneration = {
      type: 'generation.progress',
      versionId: 'v1',
      generationId: 'g1',
      progression: 42,
      message: 'En cours',
    };
    expect(e.type).toBe('generation.progress');
    expect(e.versionId).toBe('v1');
    expect(e.progression).toBe(42);
    expect(e.message).toBe('En cours');
  });

  it('a la structure attendue pour echec', () => {
    const e: EvenementGeneration = {
      type: 'generation.failed',
      versionId: 'v1',
      generationId: 'g1',
      erreur: 'Timeout CP-SAT',
    };
    expect(e.type).toBe('generation.failed');
    expect(e.erreur).toBe('Timeout CP-SAT');
  });
});
