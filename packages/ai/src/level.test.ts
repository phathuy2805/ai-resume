import { describe, expect, it } from 'vitest';
import { normalizeLevel } from './level.js';

describe('normalizeLevel', () => {
  it.each([
    ['Intern', 'intern'],
    ['Thực tập sinh', 'intern'],
    ['Fresher', 'junior'],
    ['Junior Developer', 'junior'],
    ['Middle', 'middle'],
    ['Mid-level', 'middle'],
    ['Trung cấp', 'middle'],
    ['Senior', 'senior'],
    ['Team Lead', 'senior'],
    ['Trưởng nhóm', 'senior'],
  ])('%s → %s', (text, expected) => {
    expect(normalizeLevel(text)).toBe(expected);
  });

  it.each([
    ['Middle / Senior', 'middle'],
    ['Senior / Middle', 'middle'],
    ['Junior - Middle', 'junior'],
    ['Intern hoặc Fresher', 'intern'],
  ])('nhiều cấp thì lấy cấp thấp nhất: %s → %s', (text, expected) => {
    expect(normalizeLevel(text)).toBe(expected);
  });

  it.each([undefined, null, '', 'Nhân viên', 'Manager'])(
    'không nhận ra → undefined: %s',
    (text) => {
      expect(normalizeLevel(text)).toBeUndefined();
    },
  );
});
