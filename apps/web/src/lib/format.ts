const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** ISO string → "dd/mm/yyyy". */
export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

/** ISO string → "hôm nay" / "3 ngày trước" / "2 tuần trước" / "dd/mm/yyyy". */
export function formatRelativeDate(value: string, now = Date.now()): string {
  const days = Math.floor((now - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return 'hôm nay';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return formatDate(value);
}

export function formatExperience(years: number): string {
  return years > 0 ? `Kinh nghiệm từ ${years} năm` : 'Không yêu cầu kinh nghiệm';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "Nguyễn Văn An" → "NA". */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
