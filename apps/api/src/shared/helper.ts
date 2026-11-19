import { Prisma } from '../generated/prisma/client.js';

export function isUniqueConstraintPrismaError(
  error: any,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
