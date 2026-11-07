// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Message institutionnel transporté par le collaborateur SMTP. */
export interface MessageSmtp {
  readonly destinataire: string;
  readonly sujet: string;
  readonly corps: string;
}

/** Contrat minimal du transport SMTP institutionnel. */
export interface TransportSmtp {
  envoyer(message: MessageSmtp): Promise<void>;
}

/** Token d’injection du transport SMTP, remplaçable par un double en test. */
export const SMTP = Symbol('SMTP');
