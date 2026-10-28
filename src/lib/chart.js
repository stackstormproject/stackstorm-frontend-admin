/**
 * Tick values for an axis from 0 to just above `max`, on steps of 1, 2, 2.5 or 5 x 10^n,
 * with at most `count` intervals.
 */
export const niceTicks = (max, count = 4) => {
  if (!(max > 0)) return [0, 1, 2, 3, 4].slice(0, count + 1);
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough);
  const steps = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: steps + 1 }, (_, i) => i * step);
};

/** 40400 -> "40k", 1250000 -> "1.25M" for axis labels. */
export const compactNumber = (value) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
