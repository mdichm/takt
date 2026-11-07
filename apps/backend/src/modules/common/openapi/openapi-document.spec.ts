// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import type { OpenAPIObject } from '@nestjs/swagger';
import {
  CODE_ERREURS_DOCUMENTES,
  comparerDocumentsOpenApi,
  fusionnerDocumentsOpenApi,
  serialiserDocumentOpenApi,
  validerDocumentOpenApi,
} from './openapi-document';

const BASE: OpenAPIObject = {
  openapi: '3.0.0',
  info: { title: 'TAKT API', version: '1.0.0' },
  paths: {
    '/versions': {
      get: { operationId: 'versionsList', responses: { '200': { description: 'OK' } } },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
};

describe('Document OpenAPI TAKT', () => {
  it('fusionne les routes générées avec le contrat prospectif', () => {
    const genere: OpenAPIObject = {
      openapi: '3.0.0',
      info: { title: 'TAKT API', version: '1.0.0' },
      paths: {
        '/versions': {
          get: {
            operationId: 'versionsListImplemente',
            responses: { '200': { description: 'OK' } },
          },
        },
        '/health': {
          get: { operationId: 'health', responses: { '200': { description: 'OK' } } },
        },
      },
    };

    const fusion = fusionnerDocumentsOpenApi(BASE, genere);

    expect(fusion.paths?.['/versions']?.get?.operationId).toBe('versionsListImplemente');
    expect(fusion.paths?.['/health']?.get?.operationId).toBe('health');
    expect(Object.keys(fusion.paths ?? {})).toEqual(['/versions', '/health']);
  });

  it('documente les huit codes du catalogue HTTP', () => {
    const document = validerDocumentOpenApi(
      fusionnerDocumentsOpenApi(BASE, { ...BASE, paths: {} }),
    );

    expect(Object.keys(document.components?.responses ?? {})).toEqual([...CODE_ERREURS_DOCUMENTES]);
    expect(document.components?.responses?.['429']).toBeDefined();
    expect(document.components?.responses?.['500']).toBeDefined();
  });

  it('expose un schéma de sécurité bearerAuth unique', () => {
    const base: OpenAPIObject = {
      ...BASE,
      security: [{ BearerAuth: [] }],
      components: {
        ...BASE.components,
        securitySchemes: {
          ...BASE.components?.securitySchemes,
          BearerAuth: { type: 'http', scheme: 'bearer' },
        },
      },
    };
    const document = validerDocumentOpenApi(
      fusionnerDocumentsOpenApi(base, { ...base, paths: {} }),
    );

    expect(document.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(document.components?.securitySchemes?.BearerAuth).toBeUndefined();
    expect(document.security).toEqual([{ bearerAuth: [] }]);
  });

  it('déclare la sécurité JWT sur chaque route métier protégée', () => {
    const base: OpenAPIObject = {
      ...BASE,
      paths: {
        '/versions': BASE.paths?.['/versions'] as NonNullable<OpenAPIObject['paths']>['/versions'],
        '/auth/login': { post: { responses: { '200': { description: 'OK' } } } },
        '/health': { get: { responses: { '200': { description: 'OK' } } } },
      },
    };
    const document = validerDocumentOpenApi(
      fusionnerDocumentsOpenApi(base, { ...base, paths: {} }),
    );

    expect(document.paths?.['/versions']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(document.paths?.['/auth/login']?.post?.security).toEqual([]);
    expect(document.paths?.['/health']?.get?.security).toEqual([]);
  });

  it('signale une divergence entre le contrat committé et le document généré', () => {
    const genere: OpenAPIObject = {
      ...BASE,
      paths: {
        ...BASE.paths,
        '/health': { get: { operationId: 'health', responses: { '200': { description: 'OK' } } } },
      },
    };

    const divergence = comparerDocumentsOpenApi(BASE, genere);

    expect(divergence).toContain('/health');
    expect(divergence).toContain('chemin');
  });

  it('sérialise le document de façon déterministe', () => {
    const document = validerDocumentOpenApi(
      fusionnerDocumentsOpenApi(BASE, { ...BASE, paths: {} }),
    );

    expect(serialiserDocumentOpenApi(document)).toBe(serialiserDocumentOpenApi(document));
    expect(serialiserDocumentOpenApi(document)).toContain('bearerAuth:');
  });
});
