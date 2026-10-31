// @takt/contracts — Schémas Zod partagés
// Tous les schémas de validation d'entrées externes doivent être définis ici
import { z } from 'zod';

// Schéma d'authentification (exemple)
export const AuthLoginSchema = z.object({
  email: z.string().email('Email invalide'),
  motDePasse: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

// Schéma de pagination (exemple)
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Réponse API enveloppée
export const ApiResponseSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    data: inner.nullable(),
    error: z.string().nullable(),
    meta: z.object({
      page: z.number(),
      pageSize: z.number(),
      total: z.number(),
    }),
  });

export type AuthLoginInput = z.infer<typeof AuthLoginSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
