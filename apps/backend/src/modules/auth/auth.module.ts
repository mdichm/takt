// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { PasswordService } from './password.service';

/** Module regroupant les services de sécurité de l'authentification. */
@Module({
  providers: [PasswordService],
  exports: [PasswordService],
})
export class AuthModule {}
