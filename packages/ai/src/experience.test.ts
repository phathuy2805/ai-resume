import { describe, expect, it } from 'vitest';
import { calculateTotalYearsExperience, toMonthIndex } from './experience.js';

/** Ngày đánh giá cố định của fixtures (fixtures/README.md). */
const REFERENCE = { referenceDate: new Date('2026-11-01') };
const years = (periods: Parameters<typeof calculateTotalYearsExperience>[0]) =>
  calculateTotalYearsExperience(periods, REFERENCE);

describe('toMonthIndex', () => {
  it('đọc đúng YYYY-MM, sai định dạng trả null', () => {
    expect(toMonthIndex('2024-01')).toBe(2024 * 12);
    expect(toMonthIndex('2024-12')).toBe(2024 * 12 + 11);
    for (const value of ['2024', '2024-13', '2024-00', '03/2024', '2024-3', '', null, undefined]) {
      expect(toMonthIndex(value)).toBeNull();
    }
  });
});

describe('calculateTotalYearsExperience', () => {
  it('công việc đang làm: tính đến đầu tháng của ngày tham chiếu', () => {
    // 09/2023 → hết 10/2026 = 38 tháng = 3 năm 2 tháng (cv_be_06)
    expect(years([{ startDate: '2023-09', endDate: null }])).toBe(3.2);
  });

  it('tháng kết thúc ghi cụ thể được tính hết tháng đó', () => {
    expect(years([{ startDate: '2024-01', endDate: '2024-12' }])).toBe(1);
    expect(years([{ startDate: '2024-05', endDate: '2024-05' }])).toBe(0.1);
  });

  it('2 công việc nối tiếp: cộng dồn, không tính trùng tháng chuyển việc', () => {
    // 05/2022–02/2024 (22 tháng) + 03/2024–Hiện tại (32 tháng) = 54 tháng = 4.5 năm (cv_be_01)
    expect(
      years([
        { startDate: '2024-03', endDate: null },
        { startDate: '2022-05', endDate: '2024-02' },
      ]),
    ).toBe(4.5);
  });

  it('2 công việc chồng nhau: phần trùng chỉ tính một lần', () => {
    // 01/2020–12/2021 và 06/2021–12/2022 → 01/2020–12/2022 = 3 năm
    expect(
      years([
        { startDate: '2020-01', endDate: '2021-12' },
        { startDate: '2021-06', endDate: '2022-12' },
      ]),
    ).toBe(3);
  });

  it('công việc nằm hoàn toàn bên trong công việc khác không cộng thêm', () => {
    expect(
      years([
        { startDate: '2020-01', endDate: '2022-12' },
        { startDate: '2021-03', endDate: '2021-08' },
      ]),
    ).toBe(3);
  });

  it('có khoảng trống giữa 2 công việc thì không tính khoảng trống', () => {
    // 2019 (12 tháng) + 2021 (12 tháng) = 2 năm
    expect(
      years([
        { startDate: '2019-01', endDate: '2019-12' },
        { startDate: '2021-01', endDate: '2021-12' },
      ]),
    ).toBe(2);
  });

  it('danh sách rỗng ra 0', () => {
    expect(years([])).toBe(0);
  });

  it('bỏ qua ngày sai định dạng, không có ngày bắt đầu, hoặc kết thúc trước khi bắt đầu', () => {
    expect(
      years([
        { startDate: null, endDate: '2024-01' },
        { startDate: '03/2022', endDate: null },
        { startDate: '2022-01', endDate: 'không rõ' },
        { startDate: '2024-06', endDate: '2023-01' },
        { startDate: '2025-01', endDate: '2025-12' },
      ]),
    ).toBe(1);
  });

  it('cắt phần nằm sau ngày tham chiếu', () => {
    expect(years([{ startDate: '2026-05', endDate: '2027-12' }])).toBe(0.5);
    expect(years([{ startDate: '2027-01', endDate: null }])).toBe(0);
  });

  it('làm tròn 1 chữ số thập phân', () => {
    // 27 tháng = 2.25 năm → 2.3 (cv_da_06: 2 năm 3 tháng)
    expect(years([{ startDate: '2024-08', endDate: null }])).toBe(2.3);
    // 26 tháng = 2.1666 năm → 2.2 (cv_mkt_06: 2 năm 2 tháng)
    expect(years([{ startDate: '2024-09', endDate: null }])).toBe(2.2);
  });

  it('không truyền referenceDate thì dùng ngày hiện tại', () => {
    const now = new Date();
    const start = `${now.getUTCFullYear() - 1}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(calculateTotalYearsExperience([{ startDate: start, endDate: null }])).toBe(1);
  });
});
