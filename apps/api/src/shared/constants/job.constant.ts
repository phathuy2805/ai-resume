export enum JobLevel {
  INTERN = 'INTERN',
  JUNIOR = 'JUNIOR',
  MIDDLE = 'MIDDLE',
  SENIOR = 'SENIOR',
}

export enum JobStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export const DEFAULT_RUBRIC_WEIGHTS = {
  technical: 40,
  communication: 20,
  relevance: 20,
  evidence: 20,
} as const;
