import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedUserRepository } from './repositories/shared-user.repository.js';
import { PrismaService } from './services/prisma.service.js';
import { TokenService } from './services/token.service.js';

const sharedServices = [PrismaService, SharedUserRepository, TokenService];

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [...sharedServices],
  exports: [...sharedServices, JwtModule],
})
export class SharedModule {}
