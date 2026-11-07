// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

/** Réponse mockée pour fetch (pas d'accès réseau, TE-TEST-02). */
export interface ReponseMocke {
  status: number;
  ok: boolean;
  json: unknown;
  texte?: string;
  headers?: Record<string, string>;
}

/** Crée un mock de fetch réutilisable et le stub globalement. */
export function creerMockFetch(reponse: ReponseMocke) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(reponse.json), {
      status: reponse.status,
      statusText: reponse.ok ? 'OK' : 'Error',
      headers: { 'Content-Type': 'application/json', ...reponse.headers },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}