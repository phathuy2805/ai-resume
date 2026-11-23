/**
 * Đưa chuỗi về dạng so sánh được: bỏ dấu tiếng Việt, đ → d, chữ thường.
 * Ví dụ: "Phân Tích Dữ Liệu" → "phan tich du lieu".
 */
export function fold(text: string): string {
  // \p{M}: mọi ký tự dấu (sắc, huyền, mũ...) tách ra sau khi normalize('NFD').
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
}

/** Tách thành các từ (chỉ giữ a-z, 0-9, + và #), nối bằng 1 dấu cách. */
export function toWords(text: string): string {
  return fold(text)
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim();
}

/**
 * Chuẩn hóa để so khớp nguyên văn (kiểm chứng trích dẫn CV): NFC, chữ thường, gộp mọi khoảng trắng
 * (kể cả xuống dòng) thành 1 dấu cách. KHÔNG bỏ dấu tiếng Việt như fold(): sai dấu là không khớp.
 */
export function normalizeForMatch(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
}
