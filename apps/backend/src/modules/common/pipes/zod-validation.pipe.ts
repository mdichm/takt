// ============================================================================
// TAKT — Pipe de validation Zod
// Fichier : apps/backend/src/modules/common/pipes/zod-validation.pipe.ts
// Règle : GG-05 — validation exclusivement via schémas Zod partagés
//          (@takt/contracts), sans class-validator.
// ============================================================================

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodType } from 'zod';

/** Détail d'une erreur de validation, conforme au catalogue ST_TAKT §3.4. */
export interface ValidationErrorDetail {
  champ: string;
  message: string;
}

/**
 * Transforme et valide une entrée externe à l'aide d'un schéma Zod.
 *
 * @example
 * ```ts
 * @Post()
 * create(@Body(new ZodValidationPipe(AuthLoginSchema)) body: unknown) {}
 * ```
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        details: this.formatErrors(result.error),
      });
    }

    return result.data;
  }

  /** Convertit une `ZodError` en détails lisibles (champ + message en français). */
  private formatErrors(error: ZodError): ValidationErrorDetail[] {
    return error.issues.map((issue) => ({
      champ: issue.path.join('.') || 'corps',
      message: issue.message,
    }));
  }
}