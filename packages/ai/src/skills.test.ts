import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildSkillIndex,
  mentionsSkill,
  normalizeSkill,
  normalizeSkills,
  SKILL_ALIASES,
} from './skills.js';

const FIXTURES = path.resolve(import.meta.dirname, '../fixtures');

function readJd(name: string): { requiredSkills: string[]; preferredSkills: string[] } {
  return JSON.parse(readFileSync(path.join(FIXTURES, 'jds', `jd_${name}.json`), 'utf8'));
}

/** Đọc CSV đơn giản, hỗ trợ ô trong ngoặc kép có dấu phẩy (cột reason của labels.csv). */
function readCsv(file: string): Record<string, string>[] {
  const lines = readFileSync(file, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
  const parseLine = (line: string) =>
    [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)]
      .slice(0, -1)
      .map(([, cell]) => cell!.replace(/^"|"$/g, '').replace(/""/g, '"'));
  const header = parseLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(header.map((name, i) => [name, cells[i] ?? '']));
  });
}

describe('normalizeSkill', () => {
  it.each([
    // Backend
    ['Node.js', 'NodeJS'],
    ['node js', 'NodeJS'],
    ['NODEJS', 'NodeJS'],
    ['Nest.js', 'NestJS'],
    ['Postgres', 'PostgreSQL'],
    ['REST API', 'RESTful API'],
    ['restful apis', 'RESTful API'],
    ['Amazon S3', 'AWS S3'],
    ['ASP.NET Core', '.NET'],
    ['NET Core', '.NET'],
    ['Express', 'Express.js'],
    // Dữ liệu
    ['Power BI', 'PowerBI'],
    ['power-bi', 'PowerBI'],
    ['Phân tích dữ liệu', 'Data Analysis'],
    ['PHAN TICH DU LIEU', 'Data Analysis'],
    ['Thống kê', 'Statistics'],
    ['Microsoft Excel', 'Excel'],
    ['Google BigQuery', 'BigQuery'],
    // Marketing
    ['Facebook Ads', 'Meta Ads'],
    ['GA4', 'Google Analytics'],
    ['Google Analytics 4', 'Google Analytics'],
    ['Search Engine Optimization', 'SEO'],
    ['SEO kỹ thuật', 'SEO'],
    ['Sáng tạo nội dung', 'Content Marketing'],
    ['AB Testing', 'A/B Testing'],
    ['GTM', 'Google Tag Manager'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizeSkill(raw)).toBe(expected);
  });

  it.each([
    ['SQL cơ bản', 'SQL'],
    ['Advanced Excel', 'Excel'],
    ['Excel Nâng cao', 'Excel'],
    ['Meta Ads (cơ bản)', 'Meta Ads'],
    ['Python - intermediate', 'Python'],
  ])('bỏ từ chỉ mức độ: %s → %s', (raw, expected) => {
    expect(normalizeSkill(raw)).toBe(expected);
  });

  it('không nhầm C, C# và C++', () => {
    expect(normalizeSkill('C Sharp')).toBe('C#');
    expect(normalizeSkill('C++')).toBe('C++');
    expect(normalizeSkill('C')).toBe('C');
  });

  it('kỹ năng lạ được giữ nguyên (chỉ gọn khoảng trắng), không bị bỏ', () => {
    expect(normalizeSkill('  Rust   Lang ')).toBe('Rust Lang');
    expect(normalizeSkill('Excel Kế toán')).toBe('Excel Kế toán');
  });

  it('chuỗi rỗng trả về chuỗi rỗng', () => {
    expect(normalizeSkill('   ')).toBe('');
  });
});

describe('normalizeSkills', () => {
  it('chuẩn hóa, bỏ trùng theo alias, bỏ rỗng, giữ thứ tự xuất hiện đầu tiên', () => {
    expect(normalizeSkills(['Node.js', 'SQL', 'NodeJS', '', 'node js', 'Rust', 'rust'])).toEqual([
      'NodeJS',
      'SQL',
      'Rust',
    ]);
  });
});

describe('bảng alias', () => {
  it('không có alias nào thuộc về 2 kỹ năng', () => {
    expect(() => buildSkillIndex(SKILL_ALIASES)).not.toThrow();
  });

  it('phát hiện alias bị trùng', () => {
    expect(() => buildSkillIndex({ NodeJS: ['Node'], 'Node-RED': ['node'] })).toThrow(
      /used by both/,
    );
  });

  it('mỗi tên chuẩn khi chuẩn hóa vẫn giữ nguyên', () => {
    for (const canonical of Object.keys(SKILL_ALIASES)) {
      expect(normalizeSkill(canonical)).toBe(canonical);
    }
  });
});

describe('ràng buộc với dữ liệu W1-AI-01', () => {
  it.each(['be', 'da', 'mkt'])('mọi kỹ năng trong jd_%s.json đã là tên chuẩn', (name) => {
    const jd = readJd(name);
    for (const skill of [...jd.requiredSkills, ...jd.preferredSkills]) {
      expect(normalizeSkill(skill)).toBe(skill);
    }
  });

  it('mọi giá trị missing_skills trong labels.csv đã là tên chuẩn', () => {
    const rows = readCsv(path.join(FIXTURES, 'labels.csv'));
    const skills = rows
      .flatMap((row) => row.missing_skills!.split(';'))
      .map((skill) => skill.trim())
      .filter(Boolean);

    expect(rows).toHaveLength(40);
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) expect(normalizeSkill(skill)).toBe(skill);
  });
});

describe('mentionsSkill', () => {
  const text =
    'Phát triển RESTful API bằng Node.js, tối ưu Postgres. Ưu tiên biết phân tích dữ liệu.';

  it.each(['NodeJS', 'Node.js', 'RESTful API', 'PostgreSQL', 'Data Analysis'])(
    'tìm thấy %s (theo tên chuẩn hoặc alias)',
    (skill) => {
      expect(mentionsSkill(text, skill)).toBe(true);
    },
  );

  it.each(['Docker', 'GraphQL', 'SQL'])('không tìm thấy %s', (skill) => {
    expect(mentionsSkill(text, skill)).toBe(false);
  });
});
