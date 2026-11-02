// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Controller, Get, Inject, MessageEvent, Scope, Sse, UseGuards } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { RawResponse } from '../common/http/raw-response.decorator';
import { EventsGuard } from './events.guard';
import { EventsHubService } from './events-hub.service';

/** Requête HTTP enrichie par le guard SSE. */
interface RequeteEvenementsAuthentifiee {
  utilisateur: { sub: string };
}

/** Contrôleur du canal d'événements temps réel. */
@Controller({ path: 'events', scope: Scope.REQUEST })
export class EventsController {
  constructor(
    @Inject(EventsHubService) private readonly hub: EventsHubService,
    @Inject(REQUEST) private readonly requete: RequeteEvenementsAuthentifiee,
  ) {}

  /** Ouvre le flux SSE de l'utilisateur authentifié. */
  @Get()
  @Sse()
  @UseGuards(EventsGuard)
  @RawResponse()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'S’abonner aux événements temps réel de l’utilisateur' })
  @ApiQuery({ name: 'access_token', required: false, type: String })
  @ApiOkResponse({ description: 'Flux Server-Sent Events', content: { 'text/event-stream': {} } })
  @ApiUnauthorizedResponse({ description: 'Jeton d’accès absent ou invalide' })
  fluxEvenements(): Observable<MessageEvent> {
    return this.hub.connecter(this.requete.utilisateur.sub);
  }
}
