// ============================================================================
// TAKT — Pipe de validation Zod global
// Fichier : apps/backend/src/modules/common/pipes/zod-validation.pipe.ts
// Ticket : TAKT-L01-03
// Règle : GG-05 — validation exclusivement via schémas Zod partagés
//          (@takt/contracts), sans class-validator.
//
// Le pipe est enregistré globalement (APP_PIPE). Il valide chaque entrée
// externe pour laquelle un schéma Zod a été attaché à la route via le
// décorateur `@ZodValidation()`. Les entrées sans schéma sont transmises
// inchangées.
// ============================================================================

import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { SchemasRoute, schemasDeRoute } from './zod-validation.decorator';
import { formaterErreursZod } from './zod-error';

/** Correspondance entre le type d'argument Nest et la clé de schéma. */
const CLE_PAR_TYPE: Readonly<Record<string, keyof SchemasRoute>> = {
  body: 'body',
  query: 'query',
  param: 'params',
};

@Injectable()
export class ZodValidationPipe implements PipeTransform<unknown, unknown> {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schemas = schemasDeRoute(metadata.metatype);
    if (!schemas) {
      return value;
    }

    const cle = CLE_PAR_TYPE[metadata.type];
    if (!cle) {
      return value;
    }

    const schema = schemas[cle];
    if (!schema) {
      return value;
    }

    return this.valider(schema, value);
  }

  /** Valide une valeur et lève une erreur 400 normalisée en cas d'échec. */
  private valider(schema: ZodType, valeur: unknown): unknown {
    const resultat = schema.safeParse(valeur);

    if (!resultat.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        details: formaterErreursZod(resultat.error),
      });
    }

    return resultat.data;
  }
}
