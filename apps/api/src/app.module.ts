import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DraftsModule } from './modules/drafts/drafts.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { validateEnv } from './shared/config/env.config.js';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter.js';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor.js';
import { SharedModule } from './shared/shared.module.js';
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
    SharedModule,
    AuthModule,
    JobsModule,
    ApplicationsModule,
    DraftsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
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
