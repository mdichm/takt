// Copyright (C) 2026 TAKT
// SPDX-License-Identifier: AGPL-3.0-only

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { validateEnv } from './config/env.schema';
import { AllExceptionsFilter } from './modules/common/http/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './modules/common/http/response-envelope.interceptor';
import { ZodValidationPipe } from './modules/common/pipes/zod-validation.pipe';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { CommonModule } from './modules/common/common.module';
import { EventsModule } from './modules/events/events.module';
import { ExportsModule } from './modules/exports/exports.module';
import { GenerationModule } from './modules/generation/generation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PlanningModule } from './modules/planning/planning.module';
import { ReferentielsModule } from './modules/referentiels/referentiels.module';
import { RepartitionModule } from './modules/repartition/repartition.module';
import { UsersModule } from './modules/users/users.module';
import { VersionsModule } from './modules/versions/versions.module';

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
    UsersModule,
    ReferentielsModule,
    RepartitionModule,
    VersionsModule,
    PlanningModule,
    GenerationModule,
    ExportsModule,
    AuditModule,
    NotificationsModule,
    EventsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
