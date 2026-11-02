// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { EvenementApplicatif, zEvenementApplicatif } from '@takt/contracts';

/** Nombre maximal de clients SSE simultanés pour un utilisateur. */
export const MAX_CLIENTS_PAR_UTILISATEUR = 5;

/** Taille maximale de la file d'attente d'un client SSE. */
export const MAX_EVENEMENTS_EN_ATTENTE = 100;

/** Intervalle du commentaire heartbeat, en millisecondes. */
export const INTERVALLE_HEARTBEAT_MS = 25_000;

/** Client SSE et file d'attente bornée. */
interface ClientEvenements {
  id: string;
  utilisateurId: string;
  evenements: MessageEvent[];
  sujet: Subject<MessageEvent>;
  tailleFile: number;
}

/** Hub de diffusion SSE par utilisateur. */
@Injectable()
export class EventsHubService implements OnModuleDestroy {
  private readonly clients = new Map<string, ClientEvenements>();
  private readonly heartbeat = setInterval(() => this.envoyerHeartbeat(), INTERVALLE_HEARTBEAT_MS);
  private compteur = 0;

  /** Enregistre un client et retourne son flux d'événements. */
  connecter(utilisateurId: string): Observable<MessageEvent> {
    this.evicterAnciensClientsSiNecessaire(utilisateurId);
    const client: ClientEvenements = {
      id: `${utilisateurId}-${++this.compteur}`,
      utilisateurId,
      evenements: [],
      sujet: new Subject<MessageEvent>(),
      tailleFile: 0,
    };
    this.clients.set(client.id, client);
    return new Observable<MessageEvent>((abonne) => {
      const abonnement = client.sujet.subscribe(abonne);
      return () => {
        abonnement.unsubscribe();
        this.clients.delete(client.id);
      };
    });
  }

  /** Diffuse un événement validé à tous les clients de l'utilisateur. */
  publier(utilisateurId: string, evenement: EvenementApplicatif): void {
    const charge = zEvenementApplicatif.parse(evenement);
    const message: MessageEvent = { data: charge, type: charge.type };
    for (const client of this.clients.values()) {
      if (client.utilisateurId !== utilisateurId) {
        continue;
      }
      this.ajouterAuClient(client, message);
    }
  }

  /** Nombre de clients connectés, utilisé pour les tests et le diagnostic. */
  nombreClients(utilisateurId?: string): number {
    if (!utilisateurId) {
      return this.clients.size;
    }
    return [...this.clients.values()].filter((client) => client.utilisateurId === utilisateurId).length;
  }

  /** Ferme tous les flux et libère le timer. */
  onModuleDestroy(): void {
    clearInterval(this.heartbeat);
    for (const client of this.clients.values()) {
      client.sujet.complete();
    }
    this.clients.clear();
  }

  /** Ajoute un message en supprimant le plus ancien si la file est pleine. */
  private ajouterAuClient(client: ClientEvenements, message: MessageEvent): void {
    client.evenements.push(message);
    client.tailleFile += 1;
    if (client.tailleFile > MAX_EVENEMENTS_EN_ATTENTE) {
      client.evenements.shift();
      client.tailleFile -= 1;
    }
    client.sujet.next(message);
  }

  /** Évicte le client le plus ancien quand la limite par utilisateur est atteinte. */
  private evicterAnciensClientsSiNecessaire(utilisateurId: string): void {
    const clientsUtilisateur = [...this.clients.values()].filter(
      (client) => client.utilisateurId === utilisateurId,
    );
    while (clientsUtilisateur.length >= MAX_CLIENTS_PAR_UTILISATEUR) {
      const ancien = clientsUtilisateur.shift();
      if (!ancien) {
        return;
      }
      ancien.sujet.complete();
      this.clients.delete(ancien.id);
    }
  }

  /** Envoie un commentaire heartbeat à chaque client. */
  private envoyerHeartbeat(): void {
    for (const client of this.clients.values()) {
      client.sujet.next({ data: ': ping' });
    }
  }
}
