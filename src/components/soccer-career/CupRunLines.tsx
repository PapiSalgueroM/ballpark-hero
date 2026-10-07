/* Round 1041: the domestic cup run in Soccer Career's season summary. Text and
   spans only, never a button, the DerbyLines rule: the page's walkers press
   preferred labels or the screen's last button, and a new button would change
   what they press. Every reader goes through readCupRun, so a season from
   before this round (no cupRun key) renders nothing at all. */
import { CUP_TIES_NOTE, cupExitLine, cupWinHeading, cupWinLines, readCupRun } from "@/lib/soccerCareerCup";

/** One line for a run that ended before the trophy, under the derbies. */
export function SeasonCupExitLine({ season }: { season: unknown }) {
  const run = readCupRun(season);
  const line = run ? cupExitLine(run) : null;
  if (!line) return null;
  /* no trophy on a defeat: a lost final must not read like a win at a glance */
  return <p className="text-[11px] text-muted-foreground leading-snug" data-cup-exit={run?.stages.length}>{line}</p>;
}

/** The short block for a won cup, inside the season's VictoryMoment. */
export function SeasonCupWinBlock({ season }: { season: unknown }) {
  const run = readCupRun(season);
  const lines = run ? cupWinLines(run) : [];
  if (!run || lines.length === 0) return null;
  const hasTies = run.stages.some(t => t.stage === "QF" || t.stage === "SF");
  return (
    <div className="mt-1.5 space-y-0.5 text-left" data-cup-run={run.stages.length}>
      <p className="text-[11px] font-bold text-amber-300">{cupWinHeading(run)}</p>
      {lines.map(l => (
        <p key={l} className="text-[11px] text-muted-foreground leading-snug">{l}</p>
      ))}
      {hasTies && <p className="text-[10px] text-muted-foreground/70 leading-snug">{CUP_TIES_NOTE}</p>}
    </div>
  );
}
