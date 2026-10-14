/**
 * Maps a pandas inferred frequency string (e.g. 'D', 'MS', 'W-SUN', 'h')
 * to its natural seasonal period. Mirrors backend `default_seasonal_period`.
 */
export function getDefaultSeasonalPeriod(freq: string | null | undefined, n: number): number {
  const f = (freq || '').toUpperCase();
  let period: number;
  if (f.startsWith('MIN') || f.startsWith('T')) period = 60;
  else if (f.startsWith('H') || f === 'BH') period = 24;
  else if (f.startsWith('B') && !f.startsWith('BM') && !f.startsWith('BQ')) period = 5;
  else if (f.startsWith('D')) period = 7;
  else if (f.startsWith('W')) period = 52;
  else if (f.startsWith('M') || f.startsWith('BM') || f.startsWith('SM')) period = 12;
  else if (f.startsWith('Q') || f.startsWith('BQ')) period = 4;
  else period = n >= 24 ? 12 : 7;

  // Seasonal models need at least two full cycles
  if (n > 0 && n < 2 * period) {
    period = n >= 14 ? 7 : Math.max(2, Math.floor(n / 2));
  }
  return period;
}

/** Overrides seasonal-period parameters ('period', 's') with a frequency-aware default. */
export function withSeasonalDefaults(
  params: Record<string, any>,
  freq: string | null | undefined,
  n: number
): Record<string, any> {
  const period = getDefaultSeasonalPeriod(freq, n);
  const next = { ...params };
  if ('period' in next) next.period = period;
  if ('s' in next) next.s = period;
  return next;
}
