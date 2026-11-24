import { Injectable } from '@nestjs/common';
import type { ParsedJd } from '@hireflow/ai';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../services/prisma.service.js';
import type { SaveScreeningResultParams } from './ai.type.js';
import { toPgVectorLiteral } from './ai.util.js';

@Injectable()
export class AiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findJobForAnalysis(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        requiredSkills: true,
        preferredSkills: true,
        minYearsExperience: true,
        level: true,
        parsedJd: true,
      },
    });
    if (!job) {
      return null;
    }

    const vectorRows = await this.prisma.$queryRaw<Array<{ embeddingText: string | null }>>`
      SELECT "embedding"::text AS "embeddingText"
      FROM "jobs"
      WHERE "id" = ${jobId}
    `;

    return {
      ...job,
      embeddingText: vectorRows[0]?.embeddingText ?? null,
    };
  }

  async saveJobAnalysis(jobId: string, parsedJd: ParsedJd, embedding: readonly number[]): Promise<void> {
    const vectorLiteral = toPgVectorLiteral(embedding);

    await this.prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          parsedJd: parsedJd as Prisma.InputJsonValue,
        },
      });

      await tx.$executeRaw`
        UPDATE "jobs"
        SET "embedding" = ${vectorLiteral}::vector(768)
        WHERE "id" = ${jobId}
      `;
    });
  }

  findApplicationForScreening(applicationId: string) {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        job: {
          select: {
            cvPassThreshold: true,
          },
        },
      },
    });
  }

  async saveScreeningResult({
    applicationId,
    output,
    aiRecommendation,
  }: SaveScreeningResultParams): Promise<void> {
    const vectorLiteral = toPgVectorLiteral(output.cvEmbedding);
    const screeningFields = {
      totalScore: output.total,
      breakdown: output.breakdown as unknown as Prisma.InputJsonValue,
      explanation: output.explanation as unknown as Prisma.InputJsonValue,
      timings: output.timings as unknown as Prisma.InputJsonValue,
      processingDurationMs: output.timings.totalMs,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          parsedCv: output.parsedCv as Prisma.InputJsonValue,
          aiRecommendation,
          screeningError: null,
        },
      });

      await tx.$executeRaw`
        UPDATE "applications"
        SET "embedding" = ${vectorLiteral}::vector(768)
        WHERE "id" = ${applicationId}
      `;

      await tx.screeningResult.upsert({
        where: { applicationId },
        create: {
          applicationId,
          ...screeningFields,
        },
        update: screeningFields,
      });
    });
  }
}
