import {
  academyFocusOptions, academyFocusResultLine, ACADEMY_FOCUS_RULE,
  type AcademyFocus, type AcademyReport,
} from "@/lib/soccerCareerAcademy";

/* Round 973: the academy year's two screens.

   The picker sits on the youth screen before the one academy year is played.
   Its rule line is ACADEMY_FOCUS_RULE, the same constants the year applies,
   so the promise and the effect cannot drift apart. Tapping the picked family
   again clears it, which removes the field from the save altogether.

   The report sits above the contract offers once the year is done. Every
   number on it is read off the report, which is read off the two saves, so it
   can only say what really happened. */

export function AcademyFocusPicker({ position, focus, onPick }: {
  position: string;
  focus: AcademyFocus | null;
  onPick: (focus: AcademyFocus | null) => void;
}) {
  const options = academyFocusOptions(position);
  const picked = options.find(o => o.key === focus);
  return (
    <div data-academy-focus className="bg-card border border-border rounded-xl p-4 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">🎯 Academy focus</span>
        <span className="text-[10px] text-muted-foreground">optional</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Pick one thing to work on this year: {ACADEMY_FOCUS_RULE}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map(o => {
          const on = o.key === focus;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? null : o.key)}
              className={`min-h-[36px] rounded-lg border px-2 py-1.5 text-[11px] font-bold leading-tight transition-colors active:scale-[0.98] ${
                on ? "border-emerald-500 bg-emerald-500/10 text-[hsl(var(--wc-green-ink))]" : "border-border bg-muted/20 text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground" aria-live="polite">
        {picked ? `Working on ${picked.label} this year. Tap it again to drop it.` : "No focus: every skill grows the normal way."}
      </p>
    </div>
  );
}

function seasonLine(r: AcademyReport): string {
  const games = `${r.apps} game${r.apps === 1 ? "" : "s"}`;
  if (r.keeper) return `${games} and ${r.cleanSheets} clean sheet${r.cleanSheets === 1 ? "" : "s"} for the under 18s.`;
  return `${games}, ${r.goals} goal${r.goals === 1 ? "" : "s"} and ${r.assists} assist${r.assists === 1 ? "" : "s"} for the under 18s.`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

export function AcademyReportCard({ report }: { report: AcademyReport }) {
  const gained = report.overallAfter - report.overallBefore;
  return (
    <div data-academy-report className="cm-slam bg-card border border-amber-500/30 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black">🎓 Academy report</h3>
          <p className="text-[11px] text-muted-foreground truncate">
            {report.club}, {report.year}/{(report.year + 1).toString().slice(-2)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-black">{report.overallBefore} to {report.overallAfter}</div>
          <div className="text-[10px] text-muted-foreground">Overall {signed(gained)}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {report.lines.map(l => (
          <div
            key={l.key}
            data-academy-line={l.key}
            className={`rounded-lg border px-2 py-1.5 ${l.focus ? "border-emerald-500/60 bg-emerald-500/10" : "border-border bg-muted/20"}`}
          >
            <div className="text-[10px] text-muted-foreground truncate">{l.label}{l.focus ? " 🎯" : ""}</div>
            <div className="text-sm font-black">
              {l.after} <span className={l.delta > 0 ? "text-[hsl(var(--wc-green-ink))]" : "text-muted-foreground"}>{signed(l.delta)}</span>
            </div>
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>{seasonLine(report)}</li>
        <li>{report.cupLine}</li>
        {report.focus && <li data-academy-focus-result className="text-[hsl(var(--wc-green-ink))]">{academyFocusResultLine(report.focus)}</li>}
        <li className="text-foreground">{report.verdict}</li>
      </ul>
    </div>
  );
}
