import { Injectable } from '@nestjs/common';
import { CompanyNotConfiguredException } from './company.error.js';
import { normalizeBenefits, toCompany } from './company.mapper.js';
import { CompanyRepository } from './company.repository.js';
import type {
  GetCompanyResType,
  UpdateCompanyBodyType,
  UpdateCompanyResType,
} from './company.schema.js';

@Injectable()
export class CompanyService {
  constructor(private readonly companyRepo: CompanyRepository) {}

  async getCompany(): Promise<GetCompanyResType> {
    const company = await this.companyRepo.findCompany();
    if (!company) {
      throw CompanyNotConfiguredException;
    }
    return toCompany(company);
  }

  async updateCompany(body: UpdateCompanyBodyType): Promise<UpdateCompanyResType> {
    const { benefits, ...rest } = body;
    const updated = await this.companyRepo.updateCompany({
      ...rest,
      ...(benefits !== undefined ? { benefits: normalizeBenefits(benefits) } : {}),
    });
    if (!updated) {
      throw CompanyNotConfiguredException;
    }
    return toCompany(updated);
  }
}
