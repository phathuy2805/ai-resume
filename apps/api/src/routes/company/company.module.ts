import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller.js';
import { CompanyRepository } from './company.repository.js';
import { CompanyService } from './company.service.js';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, CompanyRepository],
  exports: [CompanyService],
})
export class CompanyModule {}
