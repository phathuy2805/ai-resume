import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedApplicationStateRepository } from './repositories/shared-application-state.repository.js';
import { SharedUserRepository } from './repositories/shared-user.repository.js';
import { ApplicationStateService } from './services/application-state.service.js';
import { PrismaService } from './services/prisma.service.js';
import { StorageService } from './services/storage.service.js';
import { TokenService } from './services/token.service.js';

const sharedServices = [
  PrismaService,
  SharedUserRepository,
  SharedApplicationStateRepository,
  ApplicationStateService,
  TokenService,
  StorageService,
];

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [...sharedServices],
  exports: [...sharedServices, JwtModule],
})
export class SharedModule {}
