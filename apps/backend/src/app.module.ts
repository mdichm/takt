import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ReferentielsModule } from './modules/referentiels/referentiels.module';
import { RepartitionModule } from './modules/repartition/repartition.module';
import { VersionsModule } from './modules/versions/versions.module';
import { PlanningModule } from './modules/planning/planning.module';
import { GenerationModule } from './modules/generation/generation.module';
import { ExportsModule } from './modules/exports/exports.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { CommonModule } from './modules/common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
})
export class AppModule {}