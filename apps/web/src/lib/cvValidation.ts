export const MAX_CV_BYTES = 5 * 1024 * 1024;
export function validateCv(file: File): string | null {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
    return 'Chỉ chấp nhận file PDF (.pdf). Hãy xuất CV sang PDF trước khi nộp.';
  }
  if (file.size === 0) return 'File đang trống. Hãy chọn lại CV có nội dung.';
  if (file.size > MAX_CV_BYTES) return 'CV vượt quá 5MB. Hãy giảm dung lượng rồi nộp lại.';
  return null;
}
