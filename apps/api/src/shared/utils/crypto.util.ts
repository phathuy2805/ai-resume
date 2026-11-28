import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateNumericOtp(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, '0');
}

export function safeCompareHexHash(hashA: string, hashB: string): boolean {
  const bufA = Buffer.from(hashA, 'utf8');
  const bufB = Buffer.from(hashB, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
