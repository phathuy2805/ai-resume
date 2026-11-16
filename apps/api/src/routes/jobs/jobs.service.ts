import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { JobLevel, JobStatus } from '../../shared/constants/job.constant.js';
import { JobAnalysisTrigger } from './job-analysis.trigger.js';
import {
  JobAlreadyClosedException,
  JobCloseForbiddenException,
  JobNotFoundException,
  JobUpdateForbiddenException,
  OpenJobNotFoundException,
} from './jobs.error.js';
import {
  areSkillListsEqual,
  normalizePreferredSkills,
  normalizeSkillList,
  toHrJob,
  toPublicJob,
} from './jobs.mapper.js';
import { JobsRepository } from './jobs.repository.js';
import type {
  CloseJobResType,
  CreateJobBodyType,
  CreateJobResType,
  GetJobResType,
  GetJobsQueryType,
  GetJobsResType,
  GetMyJobsQueryType,
  GetMyJobsResType,
  UpdateJobBodyType,
  UpdateJobResType,
} from './jobs.schema.js';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepo: JobsRepository,
    private readonly jobAnalysisTrigger: JobAnalysisTrigger,
  ) {}

  async findAll(query: GetJobsQueryType): Promise<GetJobsResType> {
    const { page, limit, search } = query;
    const { items, total } = await this.jobsRepo.findOpenJobs({ page, limit, search });

    return {
      data: items.map(toPublicJob),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findJob(id: string): Promise<GetJobResType> {
    const job = await this.jobsRepo.findOpenJobById(id);
    if (!job) {
      throw OpenJobNotFoundException;
    }
    return toPublicJob(job);
  }

  async findMine(userId: string, query: GetMyJobsQueryType): Promise<GetMyJobsResType> {
    const { page, limit, search, status } = query;
    const { items, total } = await this.jobsRepo.findMyJobs({
      userId,
      page,
      limit,
      search,
      status,
    });

    return {
      data: items.map(toHrJob),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(userId: string, body: CreateJobBodyType): Promise<CreateJobResType> {
    const requiredSkills = normalizeSkillList(body.requiredSkills);
    const preferredSkills = normalizePreferredSkills(body.preferredSkills, requiredSkills);

    const job = await this.jobsRepo.createJob({
      title: body.title,
      description: body.description,
      requirements: body.requirements ?? null,
      requiredSkills,
      preferredSkills,
      minYearsExperience: body.minYearsExperience,
      level: (body.level as JobLevel | null | undefined) ?? null,
      cvPassThreshold: body.cvPassThreshold,
      interviewQuestionCount: body.interviewQuestionCount,
      rubricWeights: body.rubricWeights,
      createdById: userId,
    });

    // this.jobAnalysisTrigger.enqueue(job.id);
    return toHrJob(job);
  }

  async update(userId: string, id: string, body: UpdateJobBodyType): Promise<UpdateJobResType> {
    const existing = await this.jobsRepo.findJobById(id);
    if (!existing) {
      throw JobNotFoundException;
    }
    if (existing.createdById !== userId) {
      throw JobUpdateForbiddenException;
    }
    if (existing.status === JobStatus.CLOSED) {
      throw JobAlreadyClosedException;
    }

    const nextRequiredSkills =
      body.requiredSkills !== undefined
        ? normalizeSkillList(body.requiredSkills)
        : existing.requiredSkills;

    const nextPreferredSkills =
      body.preferredSkills !== undefined || body.requiredSkills !== undefined
        ? normalizePreferredSkills(
            body.preferredSkills ?? existing.preferredSkills,
            nextRequiredSkills,
          )
        : existing.preferredSkills;

    const nextRequirements =
      body.requirements !== undefined ? (body.requirements ?? null) : existing.requirements;

    const nextLevel =
      body.level !== undefined ? ((body.level as JobLevel | null) ?? null) : existing.level;

    const jdContentChanged =
      (body.title !== undefined && body.title !== existing.title) ||
      (body.description !== undefined && body.description !== existing.description) ||
      (body.requirements !== undefined && nextRequirements !== existing.requirements) ||
      !areSkillListsEqual(nextRequiredSkills, existing.requiredSkills) ||
      !areSkillListsEqual(nextPreferredSkills, existing.preferredSkills) ||
      (body.minYearsExperience !== undefined &&
        body.minYearsExperience !== existing.minYearsExperience) ||
      (body.level !== undefined && nextLevel !== existing.level);

    const updateData: Prisma.JobUpdateManyMutationInput = {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.requirements !== undefined && { requirements: nextRequirements }),
      ...(body.requiredSkills !== undefined && { requiredSkills: nextRequiredSkills }),
      ...(body.preferredSkills !== undefined || body.requiredSkills !== undefined
        ? { preferredSkills: nextPreferredSkills }
        : {}),
      ...(body.minYearsExperience !== undefined && {
        minYearsExperience: body.minYearsExperience,
      }),
      ...(body.level !== undefined && { level: nextLevel }),
      ...(body.cvPassThreshold !== undefined && { cvPassThreshold: body.cvPassThreshold }),
      ...(body.interviewQuestionCount !== undefined && {
        interviewQuestionCount: body.interviewQuestionCount,
      }),
      ...(body.rubricWeights !== undefined && { rubricWeights: body.rubricWeights }),
      ...(jdContentChanged && { parsedJd: Prisma.DbNull }),
    };

    const { updated, latest } = await this.jobsRepo.updateOpenOwnedJob(
      id,
      userId,
      updateData,
      jdContentChanged,
    );

    if (!updated) {
      if (!latest) {
        throw JobNotFoundException;
      }
      if (latest.createdById !== userId) {
        throw JobUpdateForbiddenException;
      }
      throw JobAlreadyClosedException;
    }

    if (jdContentChanged) {
      this.jobAnalysisTrigger.enqueue(id);
    }

    return toHrJob(updated);
  }

  async close(userId: string, id: string): Promise<CloseJobResType> {
    const existing = await this.jobsRepo.findJobByIdWithCount(id);
    if (!existing) {
      throw JobNotFoundException;
    }
    if (existing.createdById !== userId) {
      throw JobCloseForbiddenException;
    }
    if (existing.status === JobStatus.CLOSED) {
      return toHrJob(existing);
    }

    const updated = await this.jobsRepo.closeJob(id);
    return toHrJob(updated);
  }
}
