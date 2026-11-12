let accessToken: string | null = null;
let sessionVersion = 0;
export function getSessionVersion(): number {
  return sessionVersion;
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function setAccessToken(token: string): void {
  sessionVersion++;
  accessToken = token.trim() || null;
}
export function clearAccessToken(): void {
  sessionVersion++;
  accessToken = null;
}
// Rotation belongs to the same session. Login/logout invalidate in-flight requests.
export function acceptRefreshedToken(token: string, version: number): boolean {
  if (sessionVersion !== version) return false;
  accessToken = token;
  return true;
}
