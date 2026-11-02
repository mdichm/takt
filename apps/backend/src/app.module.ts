// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { validateEnv } from './config/env.schema';
import { AllExceptionsFilter } from './modules/common/http/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './modules/common/http/response-envelope.interceptor';
import { CommonModule } from './modules/common/common.module';
import { ZodValidationPipe } from './modules/common/pipes/zod-validation.pipe';
import { AuthModule } from './modules/auth/auth.module';

/** Module racine de l'application TAKT. */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    CommonModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
