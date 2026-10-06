/* Round 1012: the derby lines in Soccer Career's season summary, timeline and
   career stats. Text and spans only, never a button: the page's walkers press
   preferred labels or the screen's last button, and a new button would change
   what they press. Every reader goes through readSeasonDerbies, so a season
   from before this round (no derbies key) renders nothing at all. */
import {
  careerDerbyRecord, derbyRecord, derbySummaryLine, readSeasonDerbies,
} from "@/lib/soccerCareerDerby";

/** At most three rivals in the summary card; a Sao Paulo season can have more. */
const SUMMARY_LINES = 3;

export function SeasonDerbyLines({ season }: { season: unknown }) {
  const derbies = readSeasonDerbies(season).slice(0, SUMMARY_LINES);
  if (derbies.length === 0) return null;
  return (
    <div className="space-y-0.5" data-season-derbies={derbies.length}>
      {derbies.map(d => (
        <p key={d.rival} className="text-[11px] text-muted-foreground leading-snug">{derbySummaryLine(d)}</p>
      ))}
    </div>
  );
}

/** The timeline's W-D-L tag, over the derbies you played. */
export function DerbyChip({ season }: { season: unknown }) {
  const r = derbyRecord(readSeasonDerbies(season));
  if (r.played === 0) return null;
  return (
    <span
      className="text-[9px] font-bold px-1 rounded tabular-nums bg-orange-500/15 text-orange-400"
      data-derby-chip={`${r.w}-${r.d}-${r.l}`}
      title={`Derbies: ${r.w} won, ${r.d} drawn, ${r.l} lost`}
    >
      🔥 {r.w}-{r.d}-{r.l}
    </span>
  );
}

/** The career line under the stats grid, summed from the seasons. */
export function CareerDerbyTotals({ seasons }: { seasons: readonly unknown[] }) {
  const r = careerDerbyRecord(seasons);
  if (r.played === 0) return null;
  return (
    <p className="text-[11px] text-muted-foreground text-center mt-2" data-career-derbies={r.played}>
      🔥 Derbies: {r.played} played, {r.w} W {r.d} D {r.l} L, {r.goals} {r.goals === 1 ? "goal" : "goals"}
    </p>
  );
}
