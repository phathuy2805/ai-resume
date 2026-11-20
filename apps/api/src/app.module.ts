import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { ApplicationsModule } from './routes/applications/applications.module.js';
import { AuthModule } from './routes/auth/auth.module.js';
import { DraftsModule } from './routes/drafts/drafts.module.js';
import { JobsModule } from './routes/jobs/jobs.module.js';
import { validateEnv } from './shared/config/env.config.js';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter.js';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard.js';
import { RolesGuard } from './shared/guards/roles.guard.js';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor.js';
import { SharedModule } from './shared/shared.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    SharedModule,
    AuthModule,
    JobsModule,
    ApplicationsModule,
    DraftsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
