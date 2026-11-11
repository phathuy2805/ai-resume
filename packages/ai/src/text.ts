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
