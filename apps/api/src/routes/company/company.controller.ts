import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '../../shared/constants/auth.constant.js';
import { Public } from '../../shared/decorators/public.decorator.js';
import { Roles } from '../../shared/decorators/roles.decorator.js';
import { COMPANY_LOGO_REDIRECT_CACHE_SEC } from './company.constant.js';
import {
  ApiCompanyController,
  ApiDeleteCompanyLogoDoc,
  ApiGetCompanyDoc,
  ApiGetCompanyLogoDoc,
  ApiUpdateCompanyDoc,
  ApiUploadCompanyLogoDoc,
} from './company.docs.js';
import { GetCompanyResDto, UpdateCompanyBodyDto, UpdateCompanyResDto } from './company.dto.js';
import { CompanyService } from './company.service.js';
import { LogoUploadInterceptor } from './logo-upload.interceptor.js';

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

  /** Công khai: redirect sang presigned URL để <img src> dùng được mà bucket vẫn private. */
  @Public()
  @Get('logo')
  @ApiGetCompanyLogoDoc()
  async getLogo(@Res() res: Response): Promise<void> {
    const url = await this.companyService.getLogoSignedUrl();
    res.setHeader('Cache-Control', `public, max-age=${COMPANY_LOGO_REDIRECT_CACHE_SEC}`);
    res.redirect(HttpStatus.FOUND, url);
  }

  @Roles(Role.HR, Role.ADMIN)
  @Post('logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(LogoUploadInterceptor)
  @ApiUploadCompanyLogoDoc()
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UpdateCompanyResDto> {
    return this.companyService.uploadLogo(file);
  }

  @Roles(Role.HR, Role.ADMIN)
  @Delete('logo')
  @ApiDeleteCompanyLogoDoc()
  async deleteLogo(): Promise<UpdateCompanyResDto> {
    return this.companyService.deleteLogo();
  }
}
