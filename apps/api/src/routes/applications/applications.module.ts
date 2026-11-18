import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { CvTextExtractor } from './cv-text.extractor.js';

@Module({
  controllers: [ApplicationsController],
  providers: [CvTextExtractor],
})
export class ApplicationsModule {}
