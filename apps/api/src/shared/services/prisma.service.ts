import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg'; // Adapter cho PostgreSQL
import { PrismaClient } from '../../generated/prisma/client.js';
import envConfig from '../config/env.config.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: envConfig.DATABASE_URL,
    });
    console.log('Prisma adapter created');
    super({ adapter }); // Truyền adapter vào Prisma Client
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
