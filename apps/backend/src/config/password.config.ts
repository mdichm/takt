// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { argon2id, type Options } from 'argon2';

/**
 * Paramètres Argon2id calibrés par la fiche TAKT-L03-01.
 *
 * `memoryCost` est exprimé en KiB par la bibliothèque argon2 : 19 456 KiB
 * correspondent aux 19 MiB exigés par ST_TAKT §5.1.
 */
export const PASSWORD_ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const satisfies Options;

/** Version du format Argon2 utilisée pour détecter les paramètres d'un hash. */
export const VERSION_ARGON2 = 19;
