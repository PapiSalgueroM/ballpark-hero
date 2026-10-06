/* Round 1011: a small line chart that tells the truth about gaps.

   One value per season, null where there is nothing true to plot (a season
   nobody played, or one saved before the number was kept). The line breaks at
   a null and never draws across it, so a missing season can not pass for a
   flat one. A season standing alone between two gaps still gets its dot.
   Colour comes from the text colour of the caller (currentColor), so it reads
   in both themes. Shared, so any career screen can use it. */

export default function Sparkline({ values, label, className = "" }: { values: readonly (number | null)[]; label: string; className?: string }) {
  const known = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (known.length === 0) return null;
  const w = 260, h = 56, pad = 5;
  const lo = Math.min(...known), hi = Math.max(...known);
  const span = Math.max(hi - lo, 1);
  const x = (i: number) => (values.length === 1 ? w / 2 : pad + (i / (values.length - 1)) * (w - pad * 2));
  const y = (v: number) => h - pad - ((v - lo) / span) * (h - pad * 2);

  /* runs of consecutive known points, split wherever a value is missing */
  const runs: { i: number; v: number }[][] = [];
  let run: { i: number; v: number }[] = [];
  values.forEach((v, i) => {
    if (typeof v === "number" && Number.isFinite(v)) run.push({ i, v });
    else if (run.length) { runs.push(run); run = []; }
  });
  if (run.length) runs.push(run);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-auto ${className}`} role="img" aria-label={label} data-sparkline-gaps={values.length - known.length}>
      {runs.filter(r => r.length > 1).map((r, k) => (
        <polyline key={k} points={r.map(p => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {runs.flat().map(p => (
        <circle key={p.i} cx={x(p.i).toFixed(1)} cy={y(p.v).toFixed(1)} r="2.4" fill="currentColor" />
      ))}
    </svg>
  );
}
