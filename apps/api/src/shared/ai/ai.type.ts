import type { ParsedJd, ScreeningOutput } from '@hireflow/ai';
import type { AiRecommendation } from '../constants/application-status.enum.js';

export interface AnalyzedJobResult {
  parsedJd: ParsedJd;
  embedding: number[];
}

export interface SaveScreeningResultParams {
  applicationId: string;
  output: ScreeningOutput;
  aiRecommendation: AiRecommendation;
}

export interface SavedScreeningSummary {
  applicationId: string;
  totalScore: number;
  aiRecommendation: AiRecommendation;
}
