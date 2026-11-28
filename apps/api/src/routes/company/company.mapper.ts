import type { Company as PrismaCompany } from '../../generated/prisma/client.js';
import type { CompanyModel } from '../../shared/models/company.model.js';

export function toCompany(company: PrismaCompany): CompanyModel {
  return {
    id: company.id,
    name: company.name,
    shortName: company.shortName,
    tagline: company.tagline,
    logoUrl: company.logoUrl,
    industry: company.industry,
    companySize: company.companySize,
    foundedYear: company.foundedYear,
    address: company.address,
    website: company.website,
    contactEmail: company.contactEmail,
    phone: company.phone,
    description: company.description,
    culture: company.culture,
    benefits: company.benefits,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

/** Bỏ trùng (không phân biệt hoa thường), giữ nguyên thứ tự. */
export function normalizeBenefits(benefits: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of benefits) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
