export function candidateLoginUrl(path: string): string {
  return `/login?returnTo=${encodeURIComponent(path)}`;
}
export function safeCandidateReturnTo(value: string | null): string | null {
  return value &&
    /^\/candidate\/(?:jobs(?:\/[a-zA-Z0-9_-]+)?|applications)(?:\?[^#\\]*)?$/.test(value)
    ? value
    : null;
}
