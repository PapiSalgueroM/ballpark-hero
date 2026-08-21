import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronLeft, ChevronRight, FastForward } from 'lucide-react';
import { careerLeagueOf, INTENSITY_INFO } from '@/lib/clubManager';
import type { CareerState, CalendarEntry, TrainingPlan, TrainingIntensity } from '@/lib/clubManager';

/**
 * Round 158: the season as a real month calendar, off the phone calendar
 * screenshot he sent. Fixtures sit on their dates, played ones wear their
 * result, training days carry a cone, the window and its deadline are
 * marked, and the fast forward can jump a match, a run of matches, or the
 * whole rest of the season (it still stops at the January window and the
 * season end, because those genuinely need you).
 *
 * The dates are derived, deterministically, from the save's own clock: the
 * season kicks off on the second Saturday of August of the world year,
 * league rounds and the window take the Saturdays after it, and cup and
 * European entries slot midweek (see dateOfEntries). That is presentation,
 * not simulation: the engine's week index stays the one source of truth and
 * this screen is a pure function of it, which is why this file holds no
 * state beyond which month the eye is on.
 */

export interface CalDate { y: number; m: number; d: number; }

/** Day of week, 0 Sunday, for a Gregorian date. Sakamoto's method. */
export function dayOfWeek(y: number, m: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

export function daysInMonth(y: number, m: number): number {
  return [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function addDays(date: CalDate, n: number): CalDate {
  let { y, m, d } = date;
  d += n;
  while (d > daysInMonth(y, m)) { d -= daysInMonth(y, m); m += 1; if (m > 12) { m = 1; y += 1; } }
  while (d < 1) { m -= 1; if (m < 1) { m = 12; y -= 1; } d += daysInMonth(y, m); }
  return { y, m, d };
}

/** The season's opening Saturday: the second Saturday of August, world year. */
export function seasonKickoff(worldYear: number): CalDate {
  const firstDow = dayOfWeek(worldYear, 8, 1);
  const firstSaturday = 1 + ((6 - firstDow + 7) % 7);
  return { y: worldYear, m: 8, d: firstSaturday + 7 };
}

/** The date of a calendar entry: one Saturday per engine week. */
export function dateOfWeek(worldYear: number, weekIdx: number): CalDate {
  return addDays(seasonKickoff(worldYear), weekIdx * 7);
}

/**
 * Round 158, the honest mapping: league rounds and the window take the
 * Saturdays, cup and European entries slot into the midweek, exactly like a
 * real season. One Saturday per week for all 52 entries would stretch the
 * season to late July, which the simCalendar harness caught on its first
 * run. Dates stay strictly in entry order.
 */
export function dateOfEntries(worldYear: number, calendar: { type: string }[]): CalDate[] {
  const out: CalDate[] = [];
  let last = addDays(seasonKickoff(worldYear), -7);
  for (const entry of calendar) {
    if (entry.type === 'league' || entry.type === 'window') {
      // The next Saturday strictly after the last date used.
      let next = addDays(last, 1);
      const dow = dayOfWeek(next.y, next.m, next.d);
      next = addDays(next, (6 - dow + 7) % 7);
      out.push(next);
      last = next;
    } else {
      // Midweek: the Wednesday after a Saturday, or a week on from another midweek.
      const wasSaturday = dayOfWeek(last.y, last.m, last.d) === 6;
      const next = addDays(last, wasSaturday ? 4 : 7);
      out.push(next);
      last = next;
    }
  }
  return out;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A tiny training cone, drawn, because there is no cone emoji. */
function Cone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={cn('w-2 h-2', className)} aria-hidden="true">
      <polygon points="5,1 7.4,7.4 2.6,7.4" fill="#f97316" />
      <rect x="1.4" y="7.4" width="7.2" height="1.4" rx="0.7" fill="#fb923c" />
      <rect x="3.6" y="4.4" width="2.8" height="1" fill="#fff7ed" />
    </svg>
  );
}

/** Training days per policy, as day-of-week numbers (1 Mon .. 5 Fri). */
const TRAIN_DAYS: Record<TrainingIntensity, number[]> = {
  light: [2, 4],
  normal: [1, 3, 4],
  double: [1, 2, 3, 4, 5],
};

const POLICY_LABEL: Record<TrainingIntensity, { label: string; blurb: string }> = {
  light: { label: 'Rest first', blurb: 'Two light sessions. Freshest legs on Saturday, slowest growth.' },
  normal: { label: 'Balanced', blurb: 'Train one day, rest the next. The default rhythm.' },
  double: { label: 'Full training', blurb: 'On the grass every weekday. Fastest growth, tired legs and knocks.' },
};

interface DayCell {
  d: number;
  weekIdx: number | null;
  kind: 'fixture' | 'window' | 'training' | 'rest';
  res?: 'W' | 'D' | 'L';
  opp?: string;
  home?: boolean | null;
  comp?: string;
  isDeadline?: boolean;
  isToday?: boolean;
  past?: boolean;
}

interface CalendarScreenProps {
  career: CareerState;
  onQuickSim: (n: number) => void;
  onSetTraining: (plan: TrainingPlan) => void;
}

export function CalendarScreen({ career, onQuickSim, onSetTraining }: CalendarScreenProps) {
  const c = career;
  const worldYear = (c.startYear ?? 2026) + c.season - 1;
  const league = careerLeagueOf(c);
  const entryDates = useMemo(() => dateOfEntries(worldYear, c.calendar), [worldYear, c.calendar]);
  const todayDate = entryDates[Math.min(c.week, c.calendar.length - 1)] ?? seasonKickoff(worldYear);
  const [view, setView] = useState<{ y: number; m: number }>({ y: todayDate.y, m: todayDate.m });

  /* Every engine week, resolved to a date and what happens on it. */
  const weekInfo = useMemo(() => {
    const out = new Map<string, DayCell>();
    const played = new Map<number, { res: 'W' | 'D' | 'L'; opp: string; comp: string; home: boolean | null }>();
    for (const r of c.resultLog ?? []) played.set(r.week, { res: r.res, opp: r.opp, comp: r.comp, home: r.home });
    c.calendar.forEach((entry: CalendarEntry, w) => {
      const date = entryDates[w];
      const key = `${date.y}-${date.m}-${date.d}`;
      const p = played.get(w);
      if (entry.type === 'window') {
        out.set(key, { d: date.d, weekIdx: w, kind: 'window', isToday: w === c.week, past: w < c.week });
      } else {
        out.set(key, {
          d: date.d,
          weekIdx: w,
          kind: 'fixture',
          res: p?.res,
          opp: p?.opp,
          comp: entry.type === 'league' ? league.name : entry.type === 'cup' ? league.cupName : 'Champions League',
          home: p?.home,
          isToday: w === c.week,
          past: w < c.week,
        });
      }
    });
    return out;
  }, [c.calendar, c.resultLog, c.week, entryDates, league]);

  const intensity: TrainingIntensity = c.training?.intensity ?? 'normal';
  const seasonStart = seasonKickoff(worldYear);
  const seasonEnd = entryDates[entryDates.length - 1] ?? seasonStart;

  const inSeason = (y: number, m: number, d: number): boolean => {
    const a = y * 10000 + m * 100 + d;
    return a >= seasonStart.y * 10000 + seasonStart.m * 100 + seasonStart.d
      && a <= seasonEnd.y * 10000 + seasonEnd.m * 100 + seasonEnd.d;
  };

  /* The month grid. */
  const grid = useMemo(() => {
    const cells: (DayCell | null)[] = [];
    const lead = dayOfWeek(view.y, view.m, 1);
    for (let i = 0; i < lead; i++) cells.push(null);
    const todayA = todayDate.y * 10000 + todayDate.m * 100 + todayDate.d;
    for (let d = 1; d <= daysInMonth(view.y, view.m); d++) {
      const key = `${view.y}-${view.m}-${d}`;
      const fixture = weekInfo.get(key);
      if (fixture) { cells.push(fixture); continue; }
      const dow = dayOfWeek(view.y, view.m, d);
      const a = view.y * 10000 + view.m * 100 + d;
      if (inSeason(view.y, view.m, d) && TRAIN_DAYS[intensity].includes(dow)) {
        cells.push({ d, weekIdx: null, kind: 'training', past: a < todayA });
      } else {
        cells.push({ d, weekIdx: null, kind: 'rest', past: a < todayA });
      }
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, weekInfo, intensity, worldYear]);

  /* Month stepping, bounded to the season's span. */
  const monthKey = (y: number, m: number) => y * 100 + m;
  const canPrev = monthKey(view.y, view.m) > monthKey(seasonStart.y, seasonStart.m);
  const canNext = monthKey(view.y, view.m) < monthKey(seasonEnd.y, seasonEnd.m);
  const step = (dir: 1 | -1) => {
    setView(v => {
      let m = v.m + dir;
      let y = v.y;
      if (m > 12) { m = 1; y += 1; }
      if (m < 1) { m = 12; y -= 1; }
      return { y, m };
    });
  };

  /* Fast forward distances, in engine weeks from now. */
  const weeksLeft = c.calendar.length - c.week;
  const nextWindowIn = useMemo(() => {
    for (let w = c.week; w < c.calendar.length; w++) {
      if (c.calendar[w].type === 'window') return w - c.week + 1;
    }
    return null;
  }, [c.calendar, c.week]);
  const deadlineIn = c.transferWindow !== null ? (c.windowWeeksLeft ?? 0) : null;

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => step(-1)}
            disabled={!canPrev}
            aria-label="Previous month"
            className="rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="text-sm font-bold font-display text-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-primary" /> {MONTH_NAMES[view.m - 1]} {view.y}
          </div>
          <button
            onClick={() => step(1)}
            disabled={!canNext}
            aria-label="Next month"
            className="rounded-lg border border-border px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-[8px] text-muted-foreground uppercase tracking-wider mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {grid.map((cell, i) => {
            if (!cell) return <div key={i} />;
            return (
              <div
                key={i}
                className={cn(
                  'relative rounded-md aspect-square flex flex-col items-center justify-start pt-0.5 border',
                  cell.isToday ? 'border-primary bg-primary/10' : 'border-transparent',
                  cell.kind === 'fixture' && !cell.isToday && 'bg-secondary/60',
                  cell.kind === 'window' && 'bg-gold/10 border-gold/40',
                  cell.past && 'opacity-55',
                )}
                title={
                  cell.kind === 'fixture'
                    ? (cell.opp ? `${cell.res} vs ${cell.opp} (${cell.comp})` : `Match day (${cell.comp ?? ''})`)
                    : cell.kind === 'window' ? 'January transfer window opens'
                    : cell.kind === 'training' ? 'Training day' : 'Rest day'
                }
              >
                <span className={cn('text-[9px] leading-none', cell.isToday ? 'text-primary font-bold' : 'text-foreground')}>{cell.d}</span>
                {cell.kind === 'fixture' && (
                  cell.res ? (
                    <span className={cn(
                      'mt-0.5 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center',
                      cell.res === 'W' ? 'bg-emerald-500/25 text-emerald-400' : cell.res === 'D' ? 'bg-yellow-500/25 text-yellow-400' : 'bg-red-500/25 text-red-400',
                    )}>
                      {cell.res}
                    </span>
                  ) : (
                    <span className="mt-0.5 text-[8px]">⚽</span>
                  )
                )}
                {cell.kind === 'window' && <span className="mt-0.5 text-[8px]">❄️</span>}
                {cell.kind === 'training' && <Cone className="mt-1" />}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-[8px] text-muted-foreground">
          <span>⚽ match day</span>
          <span className="inline-flex items-center gap-0.5"><Cone /> training</span>
          <span>❄️ window opens</span>
          {deadlineIn !== null && <span className="text-gold font-bold">deadline in {deadlineIn} match week{deadlineIn === 1 ? '' : 's'}</span>}
          <span>Season: {MONTH_NAMES[seasonStart.m - 1]} {seasonStart.y} to {MONTH_NAMES[seasonEnd.m - 1]} {seasonEnd.y}</span>
        </div>
      </div>

      {/* Training policy: how the days between matches are spent. */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">🏋️ Between matches</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['light', 'normal', 'double'] as TrainingIntensity[]).map(k => (
            <button
              key={k}
              onClick={() => onSetTraining({ intensity: k, focus: c.training?.focus ?? 'balanced' })}
              className={cn(
                'rounded-lg border px-2 py-2 text-center transition-colors',
                intensity === k ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
              )}
            >
              <span className={cn('block text-[10px] font-bold', intensity === k ? 'text-primary' : 'text-foreground')}>
                {POLICY_LABEL[k].label}
              </span>
              <span className="block text-[8px] text-muted-foreground mt-0.5 leading-tight">{POLICY_LABEL[k].blurb}</span>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">
          Same engine as the training screen ({INTENSITY_INFO[intensity].label} intensity): this picks how hard the week is worked, and the cones above show it.
        </p>
      </div>

      {/* Fast forward */}
      {weeksLeft > 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <FastForward className="w-3 h-3" /> Fast forward
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              onClick={() => onQuickSim(1)}
              className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] font-bold text-foreground hover:border-primary/60 transition-colors"
            >
              Next match
            </button>
            <button
              onClick={() => onQuickSim(Math.min(4, weeksLeft))}
              className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] font-bold text-foreground hover:border-primary/60 transition-colors"
            >
              About a month
            </button>
            {nextWindowIn !== null && (
              <button
                onClick={() => onQuickSim(nextWindowIn)}
                className="rounded-lg border border-border bg-background px-2 py-2 text-[11px] font-bold text-foreground hover:border-primary/60 transition-colors"
              >
                To the window
              </button>
            )}
            <button
              onClick={() => onQuickSim(weeksLeft)}
              className="rounded-lg border border-gold/50 bg-gold/10 px-2 py-2 text-[11px] font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              Rest of season
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            Fast forwarding still stops for the January window and the season review, because those need you. The last match simmed shows its full report.
          </p>
        </div>
      )}
    </div>
  );
}

export default CalendarScreen;
