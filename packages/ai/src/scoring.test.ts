import { describe, expect, it, vi } from 'vitest';
import type { AiClient } from './client.js';
import { PARSED_CV_SCHEMA_VERSION, type ParsedCv } from './cv.js';
import { AiConfigError, AiInvalidResponseError } from './errors.js';
import { PARSED_JD_SCHEMA_VERSION, type ParsedJd } from './jd.js';
import {
  buildRelevancePrompt,
  collectCvSkills,
  combineScore,
  DEFAULT_SCORING_CONFIG,
  NO_EXPERIENCE_COMMENT,
  RELEVANCE_SYSTEM_INSTRUCTION,
  RelevanceSchema,
  resolveScoringConfig,
  scoreCv,
  scoreExperienceYears,
  scoreSimilarity,
  scoreSkills,
  type ScoreParts,
} from './scoring.js';

const JD: ParsedJd = {
  schemaVersion: PARSED_JD_SCHEMA_VERSION,
  requiredSkills: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'RESTful API', 'Docker'],
  preferredSkills: ['Redis', 'GraphQL'],
  minYearsExperience: 3,
  level: 'senior',
  educationRequirement: null,
  responsibilities: ['Phát triển RESTful API bằng NestJS', 'Tối ưu PostgreSQL'],
  domain: 'Backend Engineering',
};

function cv(overrides: Partial<ParsedCv> = {}): ParsedCv {
  return {
    schemaVersion: PARSED_CV_SCHEMA_VERSION,
    summary: 'Ứng viên backend 4 năm kinh nghiệm NodeJS.',
    skills: ['NodeJS', 'TypeScript', 'PostgreSQL', 'Docker', 'Redis'],
    experiences: [
      {
        company: 'Công ty Bí Mật',
        title: 'Backend Developer',
        startDate: '2022-01',
        endDate: null,
        description: 'Xây dựng RESTful API cho hệ thống thanh toán.',
        technologies: ['NestJS', 'PostgreSQL'],
      },
    ],
    education: [],
    projects: [
      {
        name: 'Hệ thống đặt vé',
        role: 'Backend',
        technologies: ['RESTful API'],
        description: 'API đặt vé xe khách.',
      },
    ],
    certifications: [],
    languages: [],
    totalYearsExperience: 4,
    ...overrides,
  };
}

/** Vector đơn vị 2 chiều có cosine với [1, 0] đúng bằng `cosine`. */
function vectorWithCosine(cosine: number): number[] {
  return [cosine, Math.sqrt(1 - cosine * cosine)];
}

function fakeAi(response: unknown = { comment: 'Kinh nghiệm phù hợp.', score: 7 }) {
  const generateStructured = vi.fn().mockResolvedValue(response);
  const ai = { generateStructured } as unknown as AiClient;
  return { ai, generateStructured };
}

function parts(overrides: Partial<ScoreParts> = {}): ScoreParts {
  return {
    requiredSkills: { score: 100, matched: ['A', 'B'], missing: [] },
    preferredSkills: { score: 100, matched: ['C'], missing: [] },
    experienceYears: { score: 100, candidateYears: 5, requiredYears: 3 },
    relevance: { score: 100, comment: 'ok' },
    similarity: { score: 100, cosine: 0.95 },
    ...overrides,
  };
}

const CONFIG = resolveScoringConfig();

describe('scoreSkills', () => {
  it('khớp qua alias và mức độ, giữ tên chuẩn và thứ tự theo JD', () => {
    const result = scoreSkills(['NodeJS', 'SQL', 'Docker', 'Python'], ['sql cơ bản', 'Node.js']);

    expect(result.matched).toEqual(['NodeJS', 'SQL']);
    expect(result.missing).toEqual(['Docker', 'Python']);
    expect(result.score).toBe(50);
  });

  it('không phân biệt hoa thường', () => {
    expect(scoreSkills(['PostgreSQL'], ['postgresql']).matched).toEqual(['PostgreSQL']);
  });

  it('JD không có kỹ năng nào → 100, không có matched / missing', () => {
    expect(scoreSkills([], ['NodeJS'])).toEqual({ score: 100, matched: [], missing: [] });
  });

  it('CV không có kỹ năng nào → 0', () => {
    expect(scoreSkills(['NodeJS', 'NestJS'], [])).toEqual({
      score: 0,
      matched: [],
      missing: ['NodeJS', 'NestJS'],
    });
  });

  it('kỹ năng trùng trong JD chỉ tính một lần', () => {
    expect(scoreSkills(['NodeJS', 'Node.js', 'Docker'], ['NodeJS']).score).toBe(50);
  });
});

describe('collectCvSkills', () => {
  it('gộp kỹ năng, công nghệ của công việc và dự án', () => {
    expect(collectCvSkills(cv())).toEqual(
      expect.arrayContaining(['NodeJS', 'NestJS', 'RESTful API']),
    );
  });
});

describe('scoreExperienceYears', () => {
  it('đủ hoặc vượt → 100', () => {
    expect(scoreExperienceYears(3, 3).score).toBe(100);
    expect(scoreExperienceYears(6.5, 3).score).toBe(100);
  });

  it('thiếu → theo tỷ lệ', () => {
    expect(scoreExperienceYears(1.5, 3).score).toBe(50);
    expect(scoreExperienceYears(0, 3).score).toBe(0);
  });

  it('JD không yêu cầu (null hoặc 0) → 100', () => {
    expect(scoreExperienceYears(0, null)).toEqual({
      score: 100,
      candidateYears: 0,
      requiredYears: null,
    });
    expect(scoreExperienceYears(0, 0).score).toBe(100);
  });
});

describe('scoreSimilarity', () => {
  const range = { min: 0.75, max: 0.92 };

  it('kẹp 0 dưới min, 100 trên max', () => {
    expect(scoreSimilarity(0.6, range).score).toBe(0);
    expect(scoreSimilarity(0.75, range).score).toBe(0);
    expect(scoreSimilarity(0.92, range).score).toBeCloseTo(100);
    expect(scoreSimilarity(0.99, range).score).toBe(100);
  });

  it('ở giữa thì tuyến tính, giữ cosine gốc', () => {
    const result = scoreSimilarity(0.835, range);
    expect(result.score).toBeCloseTo(50);
    expect(result.cosine).toBe(0.835);
  });
});

describe('combineScore', () => {
  it('đủ 100 mọi phần → 100, không bị chặn', () => {
    expect(combineScore(parts(), CONFIG)).toMatchObject({
      total: 100,
      breakdown: { capped: false },
    });
  });

  it('tính tổng có trọng số trên giá trị chưa làm tròn rồi làm tròn', () => {
    const result = combineScore(
      parts({
        requiredSkills: { score: 200 / 3, matched: ['A', 'B'], missing: ['C'] },
        preferredSkills: { score: 50, matched: ['D'], missing: ['E'] },
        experienceYears: { score: 50, candidateYears: 1.5, requiredYears: 3 },
        relevance: { score: 70, comment: 'ok' },
        similarity: { score: 40, cosine: 0.818 },
      }),
      CONFIG,
    );
    // 66,67×0,35 + 50×0,10 + 50×0,15 + 70×0,25 + 40×0,15 = 23,33 + 5 + 7,5 + 17,5 + 6 = 59,33
    expect(result.total).toBe(59);
    expect(result.breakdown.requiredSkills.score).toBe(67);
  });

  it('ghi đúng cấu trúc breakdown đã chốt, kèm trọng số đang dùng', () => {
    const { breakdown } = combineScore(parts(), CONFIG);

    expect(Object.keys(breakdown).sort()).toEqual(
      [
        'capped',
        'experienceYears',
        'preferredSkills',
        'relevance',
        'requiredSkills',
        'similarity',
      ].sort(),
    );
    expect(breakdown.requiredSkills).toEqual({
      score: 100,
      weight: 35,
      matched: ['A', 'B'],
      missing: [],
    });
    expect(breakdown.experienceYears).toEqual({
      score: 100,
      weight: 15,
      candidateYears: 5,
      requiredYears: 3,
    });
    expect(breakdown.relevance).toEqual({ score: 100, weight: 25, comment: 'ok' });
    expect(breakdown.similarity).toEqual({ score: 100, weight: 15, cosine: 0.95 });
  });

  it('cosine trong breakdown làm tròn 3 chữ số', () => {
    const { breakdown } = combineScore(
      parts({ similarity: { score: 90, cosine: 0.912345 } }),
      CONFIG,
    );
    expect(breakdown.similarity.cosine).toBe(0.912);
  });

  it('thiếu đúng một nửa kỹ năng bắt buộc → không chặn', () => {
    const result = combineScore(
      parts({
        requiredSkills: { score: 50, matched: ['A', 'B', 'C'], missing: ['D', 'E', 'F'] },
      }),
      CONFIG,
    );
    expect(result.breakdown.capped).toBe(false);
    expect(result.total).toBe(83); // 50×0,35 + 65 = 82,5 → 83
  });

  it('thiếu quá một nửa kỹ năng bắt buộc → chặn tối đa 49', () => {
    const result = combineScore(
      parts({
        requiredSkills: { score: 100 / 3, matched: ['A', 'B'], missing: ['C', 'D', 'E', 'F'] },
      }),
      CONFIG,
    );
    expect(result.breakdown.capped).toBe(true);
    expect(result.total).toBe(49);
  });

  it('bị chặn nhưng tổng đã dưới 49 thì giữ nguyên', () => {
    const result = combineScore(
      parts({
        requiredSkills: { score: 0, matched: [], missing: ['A', 'B'] },
        relevance: { score: 0, comment: 'khác ngành' },
        similarity: { score: 0, cosine: 0.7 },
      }),
      CONFIG,
    );
    expect(result.breakdown.capped).toBe(true);
    expect(result.total).toBe(25); // 100×0,10 + 100×0,15
  });

  it('JD không có kỹ năng bắt buộc → không chặn', () => {
    const result = combineScore(
      parts({ requiredSkills: { score: 100, matched: [], missing: [] } }),
      CONFIG,
    );
    expect(result.breakdown.capped).toBe(false);
  });

  it('dùng trọng số và capScore tùy chỉnh', () => {
    const config = resolveScoringConfig({
      weights: { requiredSkills: 50, preferredSkills: 0, relevance: 20 },
      capScore: 40,
    });
    const result = combineScore(
      parts({
        requiredSkills: { score: 0, matched: [], missing: ['A'] },
      }),
      config,
    );
    // 0×0,50 + 100×(0 + 0,15 + 0,20 + 0,15) = 50, bị chặn còn 40
    expect(result.total).toBe(40);
    expect(result.breakdown.requiredSkills.weight).toBe(50);
    expect(result.breakdown.preferredSkills.weight).toBe(0);
  });
});

describe('resolveScoringConfig', () => {
  it('không truyền gì → mặc định 35/10/15/25/15, chặn 49, cosine 0,75–0,92', () => {
    expect(resolveScoringConfig()).toEqual(DEFAULT_SCORING_CONFIG);
  });

  it('không sửa object mặc định', () => {
    resolveScoringConfig({ weights: { requiredSkills: 45, relevance: 15 } });
    expect(DEFAULT_SCORING_CONFIG.weights.requiredSkills).toBe(35);
  });

  it('tổng trọng số khác 100 → AiConfigError', () => {
    expect(() => resolveScoringConfig({ weights: { requiredSkills: 40 } })).toThrow(AiConfigError);
  });

  it('trọng số âm → AiConfigError', () => {
    expect(() =>
      resolveScoringConfig({
        weights: { requiredSkills: 45, preferredSkills: -10, relevance: 35 },
      }),
    ).toThrow(AiConfigError);
  });

  it('capScore ngoài 0–100 hoặc không nguyên → AiConfigError', () => {
    expect(() => resolveScoringConfig({ capScore: 101 })).toThrow(AiConfigError);
    expect(() => resolveScoringConfig({ capScore: 49.5 })).toThrow(AiConfigError);
  });

  it('mốc cosine min ≥ max hoặc ngoài 0–1 → AiConfigError', () => {
    expect(() => resolveScoringConfig({ similarity: { min: 0.9, max: 0.9 } })).toThrow(
      AiConfigError,
    );
    expect(() => resolveScoringConfig({ similarity: { max: 1.2 } })).toThrow(AiConfigError);
  });
});

describe('RelevanceSchema', () => {
  it('chỉ nhận điểm nguyên 0–10', () => {
    expect(RelevanceSchema.safeParse({ comment: 'x', score: 7 }).success).toBe(true);
    expect(RelevanceSchema.safeParse({ comment: 'x', score: 7.5 }).success).toBe(false);
    expect(RelevanceSchema.safeParse({ comment: 'x', score: 11 }).success).toBe(false);
    expect(RelevanceSchema.safeParse({ comment: '', score: 5 }).success).toBe(false);
  });
});

describe('buildRelevancePrompt', () => {
  it('có lĩnh vực, cấp độ, trách nhiệm của JD và công việc, dự án của CV', () => {
    const prompt = buildRelevancePrompt(cv(), JD);

    expect(prompt).toContain('Domain: Backend Engineering');
    expect(prompt).toContain('Level: senior');
    expect(prompt).toContain('- Tối ưu PostgreSQL');
    expect(prompt).toContain(
      '- Backend Developer (2022-01 – present) [NestJS, PostgreSQL]: Xây dựng RESTful API cho hệ thống thanh toán.',
    );
    expect(prompt).toContain('- Hệ thống đặt vé – Backend [RESTful API]: API đặt vé xe khách.');
  });

  it('không đưa tên công ty và số năm kinh nghiệm', () => {
    const prompt = buildRelevancePrompt(cv(), JD);

    expect(prompt).not.toContain('Công ty Bí Mật');
    expect(prompt).not.toMatch(/years? of experience/i);
  });

  it('cắt mô tả quá dài', () => {
    const long = 'a'.repeat(1000);
    const prompt = buildRelevancePrompt(
      cv({ experiences: [{ ...cv().experiences[0]!, description: long }] }),
      JD,
    );
    expect(prompt).not.toContain(long);
    expect(prompt).toContain('…');
  });

  it('CV không có dự án → ghi rõ "none"', () => {
    expect(buildRelevancePrompt(cv({ projects: [] }), JD)).toContain('Projects: none');
  });
});

describe('scoreCv', () => {
  const input = {
    parsedCv: cv(),
    parsedJd: JD,
    cvEmbedding: vectorWithCosine(0.835),
    jdEmbedding: [1, 0],
  };

  it('gộp phần tính bằng code với điểm Gemini', async () => {
    const { ai } = fakeAi({ comment: '  Kinh nghiệm phù hợp.  ', score: 7 });

    // Bỏ Docker khỏi CV; NestJS và RESTful API chỉ có trong công việc / dự án.
    const result = await scoreCv(ai, {
      ...input,
      parsedCv: cv({ skills: ['NodeJS', 'TypeScript', 'PostgreSQL', 'Redis'] }),
    });

    expect(result.breakdown.requiredSkills).toEqual({
      score: 83,
      weight: 35,
      matched: ['NodeJS', 'NestJS', 'TypeScript', 'PostgreSQL', 'RESTful API'],
      missing: ['Docker'],
    });
    expect(result.breakdown).toMatchObject({
      preferredSkills: { score: 50, matched: ['Redis'], missing: ['GraphQL'] },
      experienceYears: { score: 100, candidateYears: 4, requiredYears: 3 },
      relevance: { score: 70, weight: 25, comment: 'Kinh nghiệm phù hợp.' },
      similarity: { score: 50, cosine: 0.835 },
      capped: false,
    });
    // 83,33×0,35 + 50×0,10 + 100×0,15 + 70×0,25 + 50×0,15 = 29,17 + 5 + 15 + 17,5 + 7,5 = 74,17
    expect(result.total).toBe(74);
  });

  it('gọi Gemini với temperature 0, rubric và CallOptions truyền vào', async () => {
    const { ai, generateStructured } = fakeAi();

    await scoreCv(ai, input, { timeoutMs: 5000, config: { capScore: 40 } });

    expect(generateStructured).toHaveBeenCalledOnce();
    expect(generateStructured).toHaveBeenCalledWith(
      buildRelevancePrompt(input.parsedCv, JD),
      RelevanceSchema,
      { timeoutMs: 5000, temperature: 0, systemInstruction: RELEVANCE_SYSTEM_INSTRUCTION },
    );
  });

  it('CV không có công việc lẫn dự án → relevance 0, không gọi Gemini', async () => {
    const { ai, generateStructured } = fakeAi();

    const result = await scoreCv(ai, {
      ...input,
      parsedCv: cv({ experiences: [], projects: [] }),
    });

    expect(generateStructured).not.toHaveBeenCalled();
    expect(result.breakdown.relevance).toEqual({
      score: 0,
      weight: 25,
      comment: NO_EXPERIENCE_COMMENT,
    });
  });

  it('Gemini lỗi → ném lỗi, không cho điểm mặc định', async () => {
    const generateStructured = vi.fn().mockRejectedValue(new AiInvalidResponseError(['bad']));
    const ai = { generateStructured } as unknown as AiClient;

    await expect(scoreCv(ai, input)).rejects.toBeInstanceOf(AiInvalidResponseError);
  });

  it('embedding khác số chiều → ném RangeError trước khi gọi Gemini', async () => {
    const { ai, generateStructured } = fakeAi();

    await expect(scoreCv(ai, { ...input, jdEmbedding: [1, 0, 0] })).rejects.toBeInstanceOf(
      RangeError,
    );
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('config sai → ném AiConfigError trước khi gọi Gemini', async () => {
    const { ai, generateStructured } = fakeAi();

    await expect(
      scoreCv(ai, input, { config: { weights: { relevance: 90 } } }),
    ).rejects.toBeInstanceOf(AiConfigError);
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('cùng đầu vào và cùng điểm Gemini → cùng kết quả', async () => {
    const first = await scoreCv(fakeAi().ai, input);
    const second = await scoreCv(fakeAi().ai, input);
    expect(second).toEqual(first);
  });
});
