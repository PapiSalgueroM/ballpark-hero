/* Round 1011: the Ratings screen. A player asked to see every season's rating
   in the history, because as a centre back or a holding midfielder goals say
   little about how well he actually played. This charts the overall each
   season was played at and the season's match rating, then lists them season
   by season with the stats the engine really keeps for that position.

   Everything comes from src/lib/careerSeasonRatings.ts, so the page, the tests
   and the harness read one set of rules: a season nobody played shows a dash,
   never a 0.0, and a season saved before the overall was kept shows a dash
   for it rather than a guess. Opened from Latest Events, in the same shell as
   the Career Story, so the page under it never moves. */
import { focusDialogOnMount, escapeCloses } from "@/lib/dialogA11y";
import type { CareerState } from "@/lib/soccerCareerEngine";
import {
  soccerRatingRows, ratingSeries, careerAverageRating, ovrTrackedFrom, ovrNotYetTracked, ratingBand,
} from "@/lib/careerSeasonRatings";
import Sparkline from "@/components/career/Sparkline";
import { BAND_CLASS } from "@/lib/careerRatingBand";

type RatingsSource = Pick<CareerState, "seasons" | "position" | "overall" | "retired">;

/* Round 1045: the band colours moved to a module of their own, so the page
   can read them without loading this dialog. */
export { BAND_CLASS };

/** The dash every unknown number prints, with words a screen reader can say.
    A back line row saved before its season was stamped may hold a clean
    sheet count that was never drawn (before Round 667) or a real 0 (after it),
    so that one says it may not have been counted rather than claiming either. */
export function NotRecorded({ maybe = false }: { maybe?: boolean }) {
  return maybe
    ? <span className="text-muted-foreground" aria-label="may not have been counted" title="May not have been counted this season">-</span>
    : <span className="text-muted-foreground" aria-label="not recorded" title="Not recorded for this season">-</span>;
}

function trendLabel(what: string, points: { year: number | "now"; v: number }[], digits: number): string {
  if (points.length === 0) return `${what}: nothing recorded yet`;
  const first = points[0], last = points[points.length - 1];
  const when = (p: { year: number | "now" }) => (p.year === "now" ? "now" : `in ${p.year}`);
  return points.length === 1
    ? `${what} ${first.v.toFixed(digits)} ${when(first)}`
    : `${what} from ${first.v.toFixed(digits)} ${when(first)} to ${last.v.toFixed(digits)} ${when(last)}`;
}

function RatingsBody({ career }: { career: RatingsSource }) {
  const rows = soccerRatingRows(career.seasons, career.position);
  const series = ratingSeries(rows);
  const avg = careerAverageRating(career.seasons);
  const trackedFrom = ovrTrackedFrom(rows);
  const notYet = ovrNotYetTracked(rows);
  /* the overall line ends on today's overall, so the latest growth shows */
  const ovrLine = [...series.ovr, career.overall];
  const ovrPoints = [
    ...rows.flatMap(r => (r.ovr === null ? [] : [{ year: r.year as number | "now", v: r.ovr }])),
    { year: "now" as const, v: career.overall },
  ];
  const ratingPoints = rows.flatMap(r => (r.rating === null ? [] : [{ year: r.year as number | "now", v: r.rating }]));
  const statHeads = rows[0]?.stats ?? [];

  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No senior seasons yet. Your ratings show up here after your first season as a pro.</p>;
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Overall</div>
          <div className="text-sky-400"><Sparkline values={ovrLine} label={trendLabel("Overall", ovrPoints, 0)} /></div>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Match rating</div>
          <div className="text-emerald-400">
            {ratingPoints.length > 0
              ? <Sparkline values={series.rating} label={trendLabel("Match rating", ratingPoints, 1)} />
              : <p className="text-[10px] text-muted-foreground py-3">No games yet.</p>}
          </div>
        </div>
      </div>
      {avg && (
        <p className="text-xs" data-career-average-rating>
          Career average <strong className={`tabular-nums ${BAND_CLASS[ratingBand(avg.rating)]}`}>{avg.rating.toFixed(1)}</strong> over {avg.games} games
        </p>
      )}
      {/* A retired career has no next season, so it is told the overall was
          not kept for these seasons rather than promised one it can not get. */}
      {trackedFrom !== null ? (
        <p className="text-[10px] text-muted-foreground" data-ovr-tracked-from={trackedFrom}>
          Overall is kept from {trackedFrom} on. Seasons before that were played before it was recorded.
        </p>
      ) : notYet && career.retired ? (
        <p className="text-[10px] text-muted-foreground" data-ovr-tracked-from="never">
          Overall was not recorded for these seasons. They were played before the game kept it.
        </p>
      ) : notYet ? (
        <p className="text-[10px] text-muted-foreground" data-ovr-tracked-from="next">
          Overall is kept from your next season on. Seasons before that were played before it was recorded.
        </p>
      ) : null}
      {/* Sized for a phone: the age column only shows from sm up, the club
          truncates, and the table scrolls inside its own box rather than
          pushing the page sideways. */}
      <div className="overflow-x-auto -mx-1" data-season-ratings-table>
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-[10px] text-muted-foreground text-left">
              <th scope="col" className="font-semibold px-1 py-1">Year</th>
              <th scope="col" className="font-semibold px-1 py-1 hidden sm:table-cell">Age</th>
              <th scope="col" className="font-semibold px-1 py-1">Club</th>
              <th scope="col" className="font-semibold px-1 py-1 text-right" title="The overall you played the season at">OVR</th>
              <th scope="col" className="font-semibold px-1 py-1 text-right">Rating</th>
              {statHeads.map(st => (
                <th key={st.label} scope="col" className="font-semibold px-1 py-1 text-right" title={st.label}>{st.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.year}-${i}`} className="border-t border-border/50" data-season-ratings-row={row.year}>
                <td className="px-1 py-1 font-semibold">{row.year}</td>
                <td className="px-1 py-1 hidden sm:table-cell text-muted-foreground">{row.age}</td>
                <td className="px-1 py-1 max-w-[7.5rem]">
                  <div className="flex items-center gap-1 min-w-0">
                    {row.note && ["Banned", "Prison", "Convicted"].includes(row.note) ? null : <span className="truncate">{row.club}</span>}
                    {row.note && <span className="shrink-0 text-[9px] font-bold px-1 rounded bg-muted/60 text-muted-foreground">{row.note}</span>}
                  </div>
                </td>
                <td className="px-1 py-1 text-right" data-ratings-ovr>{row.ovr === null ? <NotRecorded /> : row.ovr}</td>
                <td className="px-1 py-1 text-right font-bold" data-ratings-rating>
                  {row.rating === null ? <NotRecorded /> : <span className={BAND_CLASS[ratingBand(row.rating)]}>{row.rating.toFixed(1)}</span>}
                </td>
                {row.stats.map(st => (
                  <td key={st.label} className="px-1 py-1 text-right" data-ratings-stat={st.label}>{st.value === null ? <NotRecorded maybe /> : st.value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** A dialog over the page, opened from Latest Events. */
export default function SeasonRatings({ career, onClose }: { career: RatingsSource; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Season Ratings" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(onClose)} data-season-ratings="dialog"
        className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-black">📈 Season Ratings</h2>
          <button type="button" onClick={onClose} className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted/30">Close</button>
        </div>
        <div className="p-4">
          <RatingsBody career={career} />
        </div>
      </div>
    </div>
  );
}
