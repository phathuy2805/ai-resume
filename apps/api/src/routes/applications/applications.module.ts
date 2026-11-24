import { Module } from '@nestjs/common';
import { ScreeningModule } from '../../shared/screening/screening.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsRepository } from './applications.repository.js';
import { ApplicationsService } from './applications.service.js';
import { CvTextExtractor } from './cv-text.extractor.js';

@Module({
  imports: [ScreeningModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationsRepository, CvTextExtractor],
})
export class ApplicationsModule {}
