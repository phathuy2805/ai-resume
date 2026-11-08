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

  // Khi dev: xuất spec ra openapi.json ở thư mục gốc repo (file FE import vào Apidog).
  // Không dùng process.cwd(): `npm run ... -w apps/api` chạy với cwd = apps/api.
  // Đường dẫn tính từ file đã build (apps/api/dist/main.js) lên 3 cấp là thư mục gốc.
  if (process.env.NODE_ENV !== 'production') {
    fs.writeFileSync(
      path.resolve(import.meta.dirname, '../../../openapi.json'),
      JSON.stringify(document, null, 2),
    );
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Swagger UI sẵn sàng tại: http://localhost:${port}/api/docs`);
  console.log(
    `📄 Swagger JSON sẵn sàng tại: http://localhost:${port}/api/docs-json`,
  );
}
await bootstrap();
