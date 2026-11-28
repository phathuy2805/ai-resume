import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/services/prisma.service.js';

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCompany() {
    return this.prisma.company.findUnique({ where: { singleton: true } });
  }

  /** Trả về null nếu chưa có dòng company nào (chưa seed). */
  async updateCompany(data: Prisma.CompanyUpdateInput) {
    try {
      return await this.prisma.company.update({ where: { singleton: true }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }
}
