import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fs from 'fs';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import path from 'path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  const document = cleanupOpenApiDoc(rawDocument);
  SwaggerModule.setup('api/docs', app, document);

  fs.writeFileSync(
    path.join(process.cwd(), 'openapi.json'),
    JSON.stringify(document, null, 2),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Swagger UI sẵn sàng tại: http://localhost:${port}/api/docs`);
  console.log(
    `📄 Swagger JSON sẵn sàng tại: http://localhost:${port}/api/docs-json`,
  );
}
await bootstrap();
