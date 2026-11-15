/** Tháng dạng "YYYY-MM", vd. "2024-03". */
export const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Một khoảng làm việc. endDate = null nghĩa là đang làm ("Present", "Hiện tại"). */
export interface ExperiencePeriod {
  startDate: string | null;
  endDate: string | null;
}

export interface TotalYearsOptions {
  /**
   * Mốc "hôm nay" để tính công việc đang làm (endDate = null). Mặc định là thời điểm gọi hàm.
   * Fixtures và unit test truyền cố định new Date('2026-11-01') (xem fixtures/README.md)
   * để số năm không đổi theo ngày chạy. Đọc theo UTC.
   */
  referenceDate?: Date;
}

/** "YYYY-MM" → số tháng tính từ năm 0 (để so sánh, cộng trừ). Sai định dạng trả null. */
export function toMonthIndex(value: string | null | undefined): number | null {
  const match = value ? YEAR_MONTH_PATTERN.exec(value) : null;
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

/**
 * Tổng số năm kinh nghiệm, làm tròn 1 chữ số thập phân. Quy tắc theo fixtures/README.md:
 * - Tháng bắt đầu tính từ ngày 01; tháng kết thúc ghi cụ thể được tính hết tháng đó.
 * - Đang làm (endDate = null) thì kết thúc ở đầu tháng của referenceDate (tháng đó không tính).
 * - Các khoảng chồng nhau hoặc nối tiếp nhau chỉ tính một lần (làm 2 việc cùng lúc không tính 2 lần).
 * - Bỏ qua khoảng không có ngày bắt đầu hợp lệ, có ngày kết thúc sai định dạng, hoặc kết thúc trước khi bắt đầu.
 * - Phần nằm sau referenceDate bị cắt bỏ.
 *
 * @example
 * calculateTotalYearsExperience([{ startDate: '2023-09', endDate: null }], {
 *   referenceDate: new Date('2026-11-01'),
 * }); // 3.2 (3 năm 2 tháng)
 */
export function calculateTotalYearsExperience(
  periods: readonly ExperiencePeriod[],
  options: TotalYearsOptions = {},
): number {
  const reference = options.referenceDate ?? new Date();
  // Mốc kết thúc (không tính): đầu tháng của referenceDate.
  const referenceIndex = reference.getUTCFullYear() * 12 + reference.getUTCMonth();

  // Mỗi khoảng là [start, end): end là tháng ngay sau tháng kết thúc.
  const ranges: Array<[number, number]> = [];
  for (const period of periods) {
    const start = toMonthIndex(period.startDate);
    if (start === null) continue;

    let end: number;
    if (period.endDate === null) {
      end = referenceIndex;
    } else {
      const endMonth = toMonthIndex(period.endDate);
      if (endMonth === null) continue;
      end = endMonth + 1;
    }

    end = Math.min(end, referenceIndex);
    if (end > start) ranges.push([start, end]);
  }

  ranges.sort((a, b) => a[0] - b[0]);

  let totalMonths = 0;
  let current: [number, number] | null = null;
  for (const range of ranges) {
    if (current && range[0] <= current[1]) {
      current[1] = Math.max(current[1], range[1]);
      continue;
    }
    if (current) totalMonths += current[1] - current[0];
    current = [range[0], range[1]];
  }
  if (current) totalMonths += current[1] - current[0];

  return Math.round((totalMonths / 12) * 10) / 10;
}
