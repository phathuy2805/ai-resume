import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../../shared/services/storage.service.js';
import { COMPANY_LOGO_S3_PREFIX, COMPANY_LOGO_SIGNED_URL_EXPIRES_SEC } from './company.constant.js';
import { CompanyLogoNotFoundException, CompanyNotConfiguredException } from './company.error.js';
import { normalizeBenefits, toCompany } from './company.mapper.js';
import { CompanyRepository } from './company.repository.js';
import type {
  GetCompanyResType,
  UpdateCompanyBodyType,
  UpdateCompanyResType,
} from './company.schema.js';
import { validateLogoFile } from './logo-file.validator.js';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly storage: StorageService,
  ) {}

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

  /**
   * Tải logo mới lên S3 rồi mới ghi key vào DB. Ghi DB lỗi thì xoá file vừa tải (tránh rác trên S3);
   * thành công thì xoá logo cũ (lỗi xoá chỉ ghi log, không làm hỏng request).
   */
  async uploadLogo(file: Express.Multer.File | undefined): Promise<UpdateCompanyResType> {
    const validated = validateLogoFile(file);
    const existing = await this.companyRepo.findCompany();
    if (!existing) {
      throw CompanyNotConfiguredException;
    }

    const newKey = `${COMPANY_LOGO_S3_PREFIX}/${randomUUID()}.${validated.extension}`;
    await this.storage.putObject(newKey, validated.buffer, validated.mimeType);

    let updated;
    try {
      updated = await this.companyRepo.updateLogoKey(newKey);
    } catch (error) {
      await this.deleteS3ObjectSafe(newKey);
      throw error;
    }
    if (!updated) {
      await this.deleteS3ObjectSafe(newKey);
      throw CompanyNotConfiguredException;
    }

    if (existing.logoS3Key && existing.logoS3Key !== newKey) {
      await this.deleteS3ObjectSafe(existing.logoS3Key);
    }
    return toCompany(updated);
  }

  async deleteLogo(): Promise<UpdateCompanyResType> {
    const existing = await this.companyRepo.findCompany();
    if (!existing) {
      throw CompanyNotConfiguredException;
    }
    if (!existing.logoS3Key) {
      return toCompany(existing);
    }

    const updated = await this.companyRepo.updateLogoKey(null);
    if (!updated) {
      throw CompanyNotConfiguredException;
    }
    await this.deleteS3ObjectSafe(existing.logoS3Key);
    return toCompany(updated);
  }

  /** Presigned URL (1 giờ) của logo hiện tại, dùng cho endpoint redirect công khai. */
  async getLogoSignedUrl(): Promise<string> {
    const company = await this.companyRepo.findCompany();
    if (!company?.logoS3Key) {
      throw CompanyLogoNotFoundException;
    }
    return this.storage.getSignedUrl(company.logoS3Key, COMPANY_LOGO_SIGNED_URL_EXPIRES_SEC);
  }

  private async deleteS3ObjectSafe(key: string): Promise<void> {
    try {
      await this.storage.deleteObject(key);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Không xóa được logo trên S3 (${key}): ${reason}`);
    }
  }
}
