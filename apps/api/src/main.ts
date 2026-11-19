import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import path from 'path';
import { AppModule } from './app.module.js';
import envConfig from './shared/config/env.config.js';
import { wrapOpenApiSuccessResponses } from './shared/utils/openapi.util.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.enableCors({
    origin: envConfig.FRONTEND_ORIGIN,
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('AI-Resume API SPEC')
    .setDescription('Tài liệu API hệ thống tuyển dụng AI-Resume (Specs v1.0)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Nhập access Token',
      },
      'JWT-auth',
    )
    .build();

  const rawDocument = SwaggerModule.createDocument(app, config);
  const document = wrapOpenApiSuccessResponses(cleanupOpenApiDoc(rawDocument));
  SwaggerModule.setup('api/docs', app, document);

  if (process.env.NODE_ENV !== 'production') {
    fs.writeFileSync(
      path.resolve(import.meta.dirname, '../../../openapi.json'),
      JSON.stringify(document, null, 2),
    );
  }

  const port = envConfig.PORT;
  await app.listen(port);
  console.log(`🚀 Swagger UI sẵn sàng tại: http://localhost:${port}/api/docs`);
  console.log(`📄 Swagger JSON sẵn sàng tại: http://localhost:${port}/api/docs-json`);
}
await bootstrap();
