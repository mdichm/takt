// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Inject, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { SOLVEUR } from './solveur.token';
import { Solveur } from './solveur.token';

@Injectable()
class ServiceGenerationDouble {
  constructor(@Inject(SOLVEUR) readonly solveur: Solveur) {}
}

describe('Tokens d’injection des collaborateurs externes', () => {
  it('permet d’injecter un double du solveur sans appel réel', async () => {
    const solve = vi.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [ServiceGenerationDouble, { provide: SOLVEUR, useValue: { solve } }],
    }).compile();

    const service = moduleRef.get(ServiceGenerationDouble);

    await service.solveur.solve({});

    expect(solve).toHaveBeenCalledOnce();
    expect(solve).toHaveBeenCalledWith({});
  });
});
