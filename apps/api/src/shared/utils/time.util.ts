const DURATION_UNITS_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDurationMs(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/i.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: "${duration}"`);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return amount * DURATION_UNITS_MS[unit];
}

