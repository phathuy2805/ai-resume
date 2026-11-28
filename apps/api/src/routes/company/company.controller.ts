import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '../../shared/constants/auth.constant.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { ApiCompanyController, ApiGetCompanyDoc, ApiUpdateCompanyDoc } from './company.docs.js';
import { GetCompanyResDto, UpdateCompanyBodyDto, UpdateCompanyResDto } from './company.dto.js';
import { CompanyService } from './company.service.js';

@ApiCompanyController()
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Public()
  @Get()
  @ApiGetCompanyDoc()
  async getCompany(): Promise<GetCompanyResDto> {
    return this.companyService.getCompany();
  }

  @Roles(Role.HR, Role.ADMIN)
  @Patch()
  @ApiUpdateCompanyDoc()
  async updateCompany(@Body() body: UpdateCompanyBodyDto): Promise<UpdateCompanyResDto> {
    return this.companyService.updateCompany(body);
  }
}
