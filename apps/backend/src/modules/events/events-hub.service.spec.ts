// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessageEvent } from '@nestjs/common';
import { EventsHubService, MAX_CLIENTS_PAR_UTILISATEUR } from './events-hub.service';

const UTILISATEUR_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';

describe('EventsHubService', () => {
  const hub = new EventsHubService();

  afterEach(() => hub.onModuleDestroy());

  it('diffuse un événement au client du même utilisateur', () => {
    const messages: MessageEvent[] = [];
    hub.connecter(UTILISATEUR_ID).subscribe((message) => messages.push(message));

    hub.publier(UTILISATEUR_ID, { type: 'generation.done', versionId: VERSION_ID });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.type).toBe('generation.done');
  });

  it('isole les utilisateurs', () => {
    const messages: MessageEvent[] = [];
    hub.connecter('33333333-3333-4333-8333-333333333333').subscribe((message) => messages.push(message));

    hub.publier(UTILISATEUR_ID, { type: 'generation.done', versionId: VERSION_ID });

    expect(messages).toHaveLength(0);
  });

  it('évince le client le plus ancien au-delà de cinq clients', () => {
    for (let index = 0; index < MAX_CLIENTS_PAR_UTILISATEUR; index += 1) {
      hub.connecter(UTILISATEUR_ID).subscribe();
    }
    expect(hub.nombreClients(UTILISATEUR_ID)).toBe(5);

    hub.connecter(UTILISATEUR_ID).subscribe();

    expect(hub.nombreClients(UTILISATEUR_ID)).toBe(5);
  });

  it('envoie un heartbeat toutes les vingt-cinq secondes', () => {
    vi.useFakeTimers();
    const hubAvecTimers = new EventsHubService();
    const messages: MessageEvent[] = [];
    hubAvecTimers.connecter(UTILISATEUR_ID).subscribe((message) => messages.push(message));

    vi.advanceTimersByTime(25_000);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.data).toBe(': ping');
    hubAvecTimers.onModuleDestroy();
    vi.useRealTimers();
  });

  it('borne la file et conserve les événements les plus récents', () => {
    const messages: MessageEvent[] = [];
    hub.connecter(UTILISATEUR_ID).subscribe((message) => messages.push(message));

    for (let index = 0; index < 101; index += 1) {
      hub.publier(UTILISATEUR_ID, { type: 'generation.progress', versionId: VERSION_ID, progression: index });
    }

    expect(messages).toHaveLength(101);
    expect(messages.at(-1)?.data).toMatchObject({ progression: 100 });
  });

  it('supprime le client lors de la fermeture du flux', () => {
    const flux = hub.connecter(UTILISATEUR_ID);
    const abonnement = flux.subscribe();
    expect(hub.nombreClients(UTILISATEUR_ID)).toBe(1);

    abonnement.unsubscribe();

    expect(hub.nombreClients(UTILISATEUR_ID)).toBe(0);
  });
});
