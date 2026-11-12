import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './services/prisma.service.js';

const sharedServices = [PrismaService];

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [...sharedServices],
  exports: [...sharedServices, JwtModule],
})
export class SharedModule {}
