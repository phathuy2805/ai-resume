/** Hồ sơ doanh nghiệp tuyển dụng (GET /company). Hệ thống chỉ phục vụ 1 doanh nghiệp. */
export interface Company {
  id: string;
  name: string;
  shortName: string | null;
  tagline: string | null;
  logoUrl: string | null;
  industry: string | null;
  companySize: string | null;
  foundedYear: number | null;
  address: string | null;
  website: string | null;
  contactEmail: string | null;
  phone: string | null;
  description: string | null;
  culture: string | null;
  benefits: string[];
  createdAt: string;
  updatedAt: string;
}
