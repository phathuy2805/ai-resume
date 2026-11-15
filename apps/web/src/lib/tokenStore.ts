let accessToken: string | null = null;
let sessionVersion = 0;
const listeners = new Set<() => void>();
export function subscribeAccessToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function emit() {
  for (const listener of listeners) listener();
}
export function getSessionVersion(): number {
  return sessionVersion;
}
export function getAccessToken(): string | null {
  return accessToken;
}
export function setAccessToken(token: string): void {
  sessionVersion++;
  accessToken = token.trim() || null;
  emit();
}
export function clearAccessToken(): void {
  sessionVersion++;
  accessToken = null;
  emit();
}
// Rotation belongs to the same session. Login/logout invalidate in-flight requests.
export function acceptRefreshedToken(token: string, version: number): boolean {
  if (sessionVersion !== version) return false;
  accessToken = token;
  emit();
  return true;
}
