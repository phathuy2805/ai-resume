import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsRepository } from './applications.repository.js';
import { ApplicationsService } from './applications.service.js';
import { CvTextExtractor } from './cv-text.extractor.js';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationsRepository, CvTextExtractor],
})
export class ApplicationsModule {}
