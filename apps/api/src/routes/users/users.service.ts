import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  SharedUserRepository,
  safeUserSelect,
  type SafeUser,
} from '../../shared/repositories/shared-user.repository.js';

export { safeUserSelect, type SafeUser };

@Injectable()
export class UsersService {
  constructor(private readonly sharedUserRepo: SharedUserRepository) {}

  findByEmail(email: string) {
    return this.sharedUserRepo.findByEmail(email);
  }

  findById(id: string): Promise<SafeUser | null> {
    return this.sharedUserRepo.findById(id);
  }

  createUser(data: Prisma.UserCreateInput): Promise<SafeUser> {
    return this.sharedUserRepo.createUser(data);
  }
}
