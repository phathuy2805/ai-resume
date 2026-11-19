import type { Job as PrismaJob } from '../../generated/prisma/client.js';
import {
  DEFAULT_RUBRIC_WEIGHTS,
  type JobLevel,
  type JobStatus,
} from '../../shared/constants/job.constant.js';
import { type RubricWeightsModel } from '../../shared/models/job.model.js';
import type { CreateJobResType, GetJobResType } from './jobs.schema.js';

export type PrismaJobWithCount = PrismaJob & {
  _count: { applications: number };
};

export function normalizeSkillList(skills: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of skills) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function normalizePreferredSkills(
  preferredSkills: readonly string[],
  requiredSkills: readonly string[],
): string[] {
  const requiredKeys = new Set(requiredSkills.map((s) => s.toLowerCase()));
  return normalizeSkillList(preferredSkills).filter(
    (skill) => !requiredKeys.has(skill.toLowerCase()),
  );
}

export function areSkillListsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function parseRubricWeights(raw: unknown): RubricWeightsModel {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_RUBRIC_WEIGHTS };
  }
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.technical === 'number' &&
    typeof obj.communication === 'number' &&
    typeof obj.relevance === 'number' &&
    typeof obj.evidence === 'number'
  ) {
    return {
      technical: obj.technical,
      communication: obj.communication,
      relevance: obj.relevance,
      evidence: obj.evidence,
    };
  }
  return { ...DEFAULT_RUBRIC_WEIGHTS };
}

export function toPublicJob(job: PrismaJob): GetJobResType {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    requirements: job.requirements ?? null,
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    minYearsExperience: job.minYearsExperience,
    level: (job.level as JobLevel | null) ?? null,
    status: job.status as JobStatus,
    interviewQuestionCount: job.interviewQuestionCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export function toHrJob(job: PrismaJobWithCount): CreateJobResType {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    requirements: job.requirements ?? null,
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    minYearsExperience: job.minYearsExperience,
    level: (job.level as JobLevel | null) ?? null,
    status: job.status as JobStatus,
    interviewQuestionCount: job.interviewQuestionCount,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    cvPassThreshold: job.cvPassThreshold,
    rubricWeights: parseRubricWeights(job.rubricWeights),
    createdById: job.createdById,
    applicationCount: job._count.applications,
    isAnalyzed: job.parsedJd !== null,
  };
}
