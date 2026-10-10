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
import { useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { defaultSeasonComparison, seasonHistoryRows } from "@/lib/soccerCareerSeasonHistory";
import SoccerSeasonHistory from "./SoccerSeasonHistory";
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
  const rows = seasonHistoryRows(career);
  const defaults = defaultSeasonComparison(rows);
  const [mode, setMode] = useState<"ratings" | "compare" | "availability" | "help">("ratings");
  const [first, setFirst] = useState(defaults?.[0] ?? -1);
  const [second, setSecond] = useState(defaults?.[1] ?? -1);
  const [availability, setAvailability] = useState(rows[rows.length - 1]?.index ?? -1);
  const opener = useRef<HTMLElement | null>(typeof document === "undefined" ? null : document.activeElement as HTMLElement);
  const scroll = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const compareButton = useRef<HTMLButtonElement>(null);
  const availabilityButton = useRef<HTMLButtonElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const offsets = useRef({ ratings: 0, compare: 0, availability: 0, help: 0 });
  const helpFrom = useRef<"ratings" | "compare" | "availability">("ratings");
  const returnFocus = useRef<"compare" | "availability" | "help" | null>(null);
  const control = "min-h-11 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  const changeMode = (next: typeof mode, focus: "compare" | "availability" | "help" | null = null) => {
    offsets.current[mode] = scroll.current?.scrollTop ?? 0;
    returnFocus.current = focus;
    setMode(next);
  };
  useLayoutEffect(() => {
    if (scroll.current) scroll.current.scrollTop = offsets.current[mode];
    const launchers = { compare: compareButton.current, availability: availabilityButton.current, help: helpButton.current };
    const target = returnFocus.current ? launchers[returnFocus.current] : mode === "ratings" ? title.current : heading.current;
    target?.focus({ preventScroll: true });
    returnFocus.current = null;
  }, [mode]);
  const showHelp = () => {
    if (mode === "help") return;
    helpFrom.current = mode;
    offsets.current.help = 0;
    changeMode("help");
  };
  const backToRatings = () => changeMode("ratings", mode === "compare" ? "compare" : "availability");

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent data-season-ratings="dialog" className="flex w-[calc(100%-1.5rem)] max-w-md max-h-[88dvh] flex-col gap-0 rounded-2xl border-border bg-card p-0 [&>button]:hidden"
      onOpenAutoFocus={event => { event.preventDefault(); title.current?.focus({ preventScroll: true }); }}
      onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <DialogTitle ref={title} tabIndex={-1} className="min-w-0 text-base font-black"><span aria-hidden="true">📈</span> Season Ratings</DialogTitle>
        <div className="flex shrink-0 gap-2">
          <button ref={helpButton} type="button" data-season-history-help aria-label="Season history help" className={`${control} min-w-11`} onClick={showHelp} disabled={mode === "help"}>?</button>
          <DialogClose asChild><button type="button" data-season-history-close className={control}>Close</button></DialogClose>
        </div>
      </div>
      <DialogDescription className="sr-only">Read your saved season ratings, compare two seasons or check recorded availability.</DialogDescription>
      <div ref={scroll} data-season-history-scroll data-season-history-mode={mode} className="min-h-0 overflow-y-auto p-4">
        {mode === "ratings" ? <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button ref={compareButton} type="button" data-season-history-open="compare" className={control} disabled={rows.length < 2} onClick={() => changeMode("compare")}>Compare seasons</button>
            <button ref={availabilityButton} type="button" data-season-history-open="availability" className={control} onClick={() => changeMode("availability")}>Availability</button>
          </div>
          {rows.length < 2 && <p className="mb-3 text-xs text-muted-foreground">Two saved senior seasons unlock comparison.</p>}
          <RatingsBody career={career} />
        </> : mode === "help" ? <div className="space-y-3 text-sm" data-season-history-help-body>
          <button type="button" data-season-history-back="help" className={control} onClick={() => changeMode(helpFrom.current, "help")}>Back to {helpFrom.current === "ratings" ? "Ratings" : helpFrom.current === "compare" ? "comparison" : "Availability"}</button>
          <h3 ref={heading} tabIndex={-1} data-season-history-heading className="font-bold">Your season history</h3>
          <p>This reads your saved simulated senior seasons. Academy years and jobs after retirement stay out. You can choose a season with no appearances, or two records from the same year.</p>
          <p>Comparison shows the second season minus the first. Season OVR is the overall you played at, not your current overall. Apps and position stats cover all club competitions. Missing numbers stay not recorded; they never become zero.</p>
          <p>Example: 12 goals in the first season and 15 in the second gives a change of +3. If the first season never kept OVR, its OVR and the change both say not recorded.</p>
          <p>Availability only shows injuries, weeks, severity and club matches missed through suspension that the save kept. Weeks are not converted to matches. A recorded injury does not prove why you missed every game.</p>
          <p>Example: a saved 4-week injury and 2 club matches missed through suspension stay separate. An older season without a saved suspension count says not recorded.</p>
        </div> : <div className="space-y-3">
          <button type="button" data-season-history-back="ratings" className={control} onClick={backToRatings}>Back to Ratings</button>
          <h3 ref={heading} tabIndex={-1} data-season-history-heading className="text-base font-bold">{mode === "compare" ? "Compare seasons" : "Availability"}</h3>
          <SoccerSeasonHistory career={career} mode={mode} first={first} second={second} availability={availability} onFirst={setFirst} onSecond={setSecond} onAvailability={setAvailability} />
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}
