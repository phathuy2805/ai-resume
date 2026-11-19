import { Injectable } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../constants/auth.constant.js';

@Injectable()
export class HashingService {
  hashPassword(value: string): Promise<string> {
    return hash(value, BCRYPT_SALT_ROUNDS);
  }

  comparePassword(typedPassword: string, hashedPassword: string): Promise<boolean> {
    return compare(typedPassword, hashedPassword);
  }
}
