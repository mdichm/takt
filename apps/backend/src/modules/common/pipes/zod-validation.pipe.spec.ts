// ============================================================================
// TAKT — Tests unitaires du pipe de validation Zod global
// Fichier : apps/backend/src/modules/common/pipes/zod-validation.pipe.spec.ts
// Ticket : TAKT-L01-03 — GG-05 (validation exclusivement par schémas Zod)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';
import { ZodValidation } from './zod-validation.decorator';

const SchemaUtilisateur = z.object({
  email: z.string().email('Email invalide'),
});

class ControleurTest {
  @ZodValidation({ body: SchemaUtilisateur })
  creerCorps(): void {
    // Méthode vide : le comportement observé est celui du pipe.
  }

  @ZodValidation({ query: SchemaUtilisateur })
  lister(): void {
    // Méthode vide : le comportement observé est celui du pipe.
  }
}

function metadonnees(type: 'body' | 'query' | 'param', metatype: unknown): ArgumentMetadata {
  return { type, metatype: metatype as ArgumentMetadata['metatype'] };
}

describe('ZodValidationPipe (global)', () => {
  const pipe = new ZodValidationPipe();

  it('laisse passer la valeur si aucun schéma n’est attaché à la route', () => {
    const valeur = { libre: true };
    expect(
      pipe.transform(
        valeur,
        metadonnees('body', function sansSchema() {}),
      ),
    ).toBe(valeur);
  });

  it('valide et transforme le corps de la requête', () => {
    const resultat = pipe.transform(
      { email: 'contact@takt.internal' },
      metadonnees('body', ControleurTest.prototype.creerCorps),
    );
    expect(resultat).toEqual({ email: 'contact@takt.internal' });
  });

  it('rejette un corps invalide avec une erreur 400 VALIDATION_ERROR', () => {
    let exception: unknown;
    try {
      pipe.transform(
        { email: 'pas-un-email' },
        metadonnees('body', ControleurTest.prototype.creerCorps),
      );
    } catch (err: unknown) {
      exception = err;
    }

    expect(exception).toBeInstanceOf(BadRequestException);
    const reponse = (exception as BadRequestException).getResponse() as {
      code: string;
      details: { champ: string; message: string }[];
    };
    expect(reponse.code).toBe('VALIDATION_ERROR');
    expect(reponse.details[0]!.champ).toBe('email');
    expect(reponse.details[0]!.message).toBe('Email invalide');
  });

  it('valide la query string lorsque le schéma est attaché à la query', () => {
    expect(() =>
      pipe.transform(
        { email: 'pas-un-email' },
        metadonnees('query', ControleurTest.prototype.lister),
      ),
    ).toThrow(BadRequestException);
  });

  it('ignore un schéma de corps lorsque la source est la query', () => {
    const valeur = { email: 'pas-un-email' };
    expect(pipe.transform(valeur, metadonnees('query', ControleurTest.prototype.creerCorps))).toBe(
      valeur,
    );
  });
});
