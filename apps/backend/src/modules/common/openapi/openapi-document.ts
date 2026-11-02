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
import { dump, load } from 'js-yaml';
import { CODES_ERREUR_API } from '../http/api-error';

/** Chemin relatif de la spécification OpenAPI committée. */
export const CHEMIN_SPEC_COMMITTEE = 'docs/openapi.yaml';

/** Réponses HTTP du catalogue ST_TAKT §3.4, dans un ordre stable. */
export const CODE_ERREURS_DOCUMENTES = [
  '400',
  '401',
  '403',
  '404',
  '409',
  '423',
  '429',
  '500',
] as const;

const DESCRIPTIONS_ERREURS: Readonly<Record<(typeof CODE_ERREURS_DOCUMENTES)[number], string>> = {
  '400': 'Requête invalide',
  '401': 'Non authentifié',
  '403': 'Interdit',
  '404': 'Ressource non trouvée',
  '409': 'Conflit',
  '423': 'Ressource verrouillée',
  '429': 'Trop de requêtes',
  '500': 'Erreur interne',
};

const CODE_METIER_PAR_STATUT: Readonly<Record<(typeof CODE_ERREURS_DOCUMENTES)[number], string>> = {
  '400': CODES_ERREUR_API.BAD_REQUEST,
  '401': CODES_ERREUR_API.UNAUTHORIZED,
  '403': CODES_ERREUR_API.FORBIDDEN,
  '404': CODES_ERREUR_API.NOT_FOUND,
  '409': CODES_ERREUR_API.CONFLICT,
  '423': CODES_ERREUR_API.LOCKED,
  '429': CODES_ERREUR_API.TOO_MANY_REQUESTS,
  '500': CODES_ERREUR_API.INTERNAL,
};

/** Opérations publiques au sens de TE-API-01. */
const OPERATIONS_PUBLIES = new Set(['post /auth/login', 'post /auth/refresh', 'get /health']);

type ObjetOperation = {
  security?: Array<Record<string, string[]>>;
};

type ObjetChemin = Record<string, ObjetOperation | undefined>;

/** Déclare la sécurité JWT opération par opération. */
function appliquerSecuriteOperations(paths: OpenAPIObject['paths']): OpenAPIObject['paths'] {
  if (!paths) {
    return paths;
  }

  return Object.fromEntries(
    Object.entries(paths).map(([chemin, item]) => {
      if (!item) {
        return [chemin, item];
      }

      const operations = Object.fromEntries(
        Object.entries(item as unknown as ObjetChemin).map(([methode, operation]) => {
          if (!operation || !['get', 'post', 'put', 'patch', 'delete'].includes(methode)) {
            return [methode, operation];
          }
          const publique = OPERATIONS_PUBLIES.has(`${methode} ${chemin}`);
          return [methode, { ...operation, security: publique ? [] : [{ bearerAuth: [] }] }];
        }),
      );

      return [chemin, operations];
    }),
  );
}

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
 * Fusionne le contrat prospectif committé et le document généré par NestJS.
 * Les opérations générées priment sur les opérations homonymes.
 */
export function fusionnerDocumentsOpenApi(
  commitee: OpenAPIObject,
  genere: OpenAPIObject,
): OpenAPIObject {
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
      responses: {
        ...commitee.components?.responses,
        ...genere.components?.responses,
      },
    },
  };
}

/** Ajoute les éléments transverses obligatoires au document OpenAPI. */
export function validerDocumentOpenApi(document: OpenAPIObject): OpenAPIObject {
  const reponses = Object.fromEntries(
    CODE_ERREURS_DOCUMENTES.map((statut) => [
      statut,
      {
        description: DESCRIPTIONS_ERREURS[statut],
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErreurApi' },
            example: { code: CODE_METIER_PAR_STATUT[statut] },
          },
        },
      },
    ]),
  );

  const securitySchemes = Object.fromEntries(
    Object.entries(document.components?.securitySchemes ?? {}).filter(
      ([nom]) => nom !== 'BearerAuth',
    ),
  );

  const schemas = {
    ...document.components?.schemas,
    ErreurApi: {
      type: 'object',
      required: ['code'],
      properties: {
        code: {
          type: 'string',
          enum: Object.values(CODES_ERREUR_API),
        },
        message: { type: 'string' },
        details: { type: 'array', items: { type: 'object' } },
      },
    },
  };

  return {
    ...document,
    security: [{ bearerAuth: [] }],
    paths: appliquerSecuriteOperations(document.paths),
    components: {
      ...document.components,
      securitySchemes: {
        ...securitySchemes,
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas,
      responses: reponses,
    },
  };
}

/**
 * Compare deux documents OpenAPI et retourne les divergences principales.
 * Une chaîne vide signifie que les documents sont identiques.
 */
export function comparerDocumentsOpenApi(attendu: OpenAPIObject, obtenu: OpenAPIObject): string {
  const divergences: string[] = [];
  const cheminsAttendus = Object.keys(attendu.paths ?? {}).sort();
  const cheminsObtenus = Object.keys(obtenu.paths ?? {}).sort();

  for (const chemin of cheminsObtenus) {
    if (!cheminsAttendus.includes(chemin)) {
      divergences.push(`chemin ajouté : ${chemin}`);
      continue;
    }
    if (JSON.stringify(attendu.paths?.[chemin]) !== JSON.stringify(obtenu.paths?.[chemin])) {
      divergences.push(`chemin modifié : ${chemin}`);
    }
  }

  for (const chemin of cheminsAttendus) {
    if (!cheminsObtenus.includes(chemin)) {
      divergences.push(`chemin supprimé : ${chemin}`);
    }
  }

  if (JSON.stringify(attendu.components) !== JSON.stringify(obtenu.components)) {
    divergences.push('components modifiés');
  }

  return divergences.join('\n');
}

/** Sérialise un document OpenAPI avec un ordre de clés déterministe. */
export function serialiserDocumentOpenApi(document: OpenAPIObject): string {
  return dump(document, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: true,
  });
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
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearerAuth',
    )
    .build();

  const genere = SwaggerModule.createDocument(app, configuration);
  const commitee = chargerSpecCommittee();
  const fusion = commitee ? fusionnerDocumentsOpenApi(commitee, genere) : genere;

  return validerDocumentOpenApi(fusion);
}
