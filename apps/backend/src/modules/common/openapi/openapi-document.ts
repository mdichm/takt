// ============================================================================
// TAKT — Construction du document OpenAPI
// Fichier : apps/backend/src/modules/common/openapi/openapi-document.ts
// Ticket : TAKT-L01-03
//
// Le document servi sur `/api/docs` est construit à partir de la
// spécification committée `docs/openapi.yaml` (contrat de l'API), enrichi
// des routes effectivement implémentées dans l'application.
// ============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { load } from 'js-yaml';

/** Chemin relatif de la spécification OpenAPI committée. */
export const CHEMIN_SPEC_COMMITTEE = 'docs/openapi.yaml';

/**
 * Recherche le fichier `openapi.yaml` parmi les emplacements possibles :
 * variable d'environnement, racine du dépôt, ou racine du monorepo.
 */
export function trouverCheminSpec(): string | undefined {
  const candidats: string[] = [];

  if (process.env.OPENAPI_SPEC_PATH) {
    candidats.push(process.env.OPENAPI_SPEC_PATH);
  }

  candidats.push(
    resolve(process.cwd(), CHEMIN_SPEC_COMMITTEE),
    resolve(process.cwd(), '../../docs/openapi.yaml'),
    resolve(process.cwd(), '../../../docs/openapi.yaml'),
  );

  return candidats.find((candidat) => existsSync(candidat));
}

/**
 * Charge la spécification OpenAPI committée.
 * @returns le document parsé, ou `undefined` si le fichier est introuvable.
 */
export function chargerSpecCommittee(): OpenAPIObject | undefined {
  const chemin = trouverCheminSpec();
  if (!chemin) {
    return undefined;
  }

  const contenu = readFileSync(chemin, 'utf-8');
  const document = load(contenu);

  if (typeof document !== 'object' || document === null) {
    return undefined;
  }

  return document as OpenAPIObject;
}

/**
 * Construit le document OpenAPI servi par Swagger.
 *
 * La spécification committée fait foi ; les routes générées à l'exécution
 * complètent le document (elles priment sur les entrées homonymes).
 */
export function construireDocumentOpenApi(app: INestApplication): OpenAPIObject {
  const configuration = new DocumentBuilder()
    .setTitle('TAKT API')
    .setDescription('API de planification et gestion des emplois du temps pédagogiques')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const genere = SwaggerModule.createDocument(app, configuration);
  const commitee = chargerSpecCommittee();

  if (!commitee) {
    return genere;
  }

  return {
    ...commitee,
    info: { ...commitee.info, ...genere.info },
    paths: { ...commitee.paths, ...genere.paths },
    components: {
      ...commitee.components,
      ...genere.components,
      schemas: {
        ...commitee.components?.schemas,
        ...genere.components?.schemas,
      },
      securitySchemes: {
        ...commitee.components?.securitySchemes,
        ...genere.components?.securitySchemes,
      },
    },
  };
}
