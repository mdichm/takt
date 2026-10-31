// ============================================================================
// TAKT — Décorateur de validation Zod par route
// Fichier : apps/backend/src/modules/common/pipes/zod-validation.decorator.ts
// Ticket : TAKT-L01-03 — GG-05
//
// Rôle : associer à une route les schémas Zod de ses entrées externes. Le
// pipe global `ZodValidationPipe` lit ces métadonnées et valide la source
// correspondante (corps, query ou paramètres de route).
// ============================================================================

import type { ZodType } from 'zod';

/** Clé de métadonnée portant les schémas Zod d'une route. */
export const ZOD_SCHEMAS_KEY = 'takt:zod-schemas';

/** Schémas Zod d'une route, par source d'entrée. */
export interface SchemasRoute {
  /** Schéma du corps de la requête. */
  body?: ZodType;
  /** Schéma de la query string. */
  query?: ZodType;
  /** Schéma des paramètres de route. */
  params?: ZodType;
}

/**
 * Attache les schémas Zod d'une route.
 *
 * @example
 * ```ts
 * @ZodValidation({ body: AuthLoginSchema })
 * @Post('login')
 * login(@Body() corps: AuthLoginInput) {}
 * ```
 */
export function ZodValidation(schemas: SchemasRoute): MethodDecorator {
  return (cible: object, cle: string | symbol, descripteur: PropertyDescriptor) => {
    Reflect.defineMetadata(ZOD_SCHEMAS_KEY, schemas, descripteur.value);
    return descripteur;
  };
}

/** Récupère les schémas Zod attachés à un gestionnaire de route. */
export function schemasDeRoute(handler: unknown): SchemasRoute | undefined {
  if (typeof handler !== 'function') {
    return undefined;
  }
  return Reflect.getMetadata(ZOD_SCHEMAS_KEY, handler) as SchemasRoute | undefined;
}
