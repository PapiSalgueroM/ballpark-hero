export const MLB_AB_LOW = 2.2;
export const MLB_AB_HIGH = 4.5;
export const mlbThousandths = (value: number) => Math.round(value * 1000);

/** Find whole hits and at-bats near the chosen volume which print the given average. */
export function mlbHitterTotals(games: number, avg: number, extra: number, want: number): { ab: number; h: number } | null {
  const lo = Math.ceil(games * MLB_AB_LOW);
  const hi = Math.floor(games * MLB_AB_HIGH);
  const target = mlbThousandths(avg);
  for (let step = 0; step <= hi - lo; step += 1) {
    for (const ab of step === 0 ? [want] : [want + step, want - step]) {
      if (ab < lo || ab > hi || ab < 1) continue;
      const hits = Math.round(avg * ab);
      for (const h of [hits, hits + 1, hits - 1]) {
        if (h >= extra && h >= 0 && h <= ab && mlbThousandths(h / ab) === target) return { ab, h };
      }
    }
  }
  return null;
}
