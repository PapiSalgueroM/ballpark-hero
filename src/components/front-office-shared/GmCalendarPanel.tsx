/**
 * Round 946: the league year on a month grid, for any GM seat.
 *
 * Sport neutral: it draws src/lib/gmCalendar.ts for the sport it is handed,
 * the same way Club Manager's calendar draws its season. Every phase of the
 * real year sits on its day (the draft, the market opening, cut down day,
 * opening day, the deadline, the playoffs), every engine round sits on its
 * range with its games, and a stop that needs the GM is outlined.
 *
 * A tap on a day plans a sim to it with planSimToDay and shows what that
 * plan does (the rounds it plays, the stop it halts at) before anything
 * happens. The Sim button appears only when the board passes onSim, and it
 * hands the board exactly the plan it showed; with no onSim the grid is a
 * read only view of the year. No board mounts it yet (Round 946 binds no
 * engine), so nothing here touches a save.
 *
 * A phase that is not two sourced (GM_CALENDAR_PARTIAL) says "expected".
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { MONTH_NAMES, dateKey, shortDate } from '@/lib/calDate';
import type { CalDate } from '@/lib/calDate';
import {
  gmLeagueYear, gmMonthGrid, monthsOf, planSimToDay, yearSteps,
  type GmHostHalt, type GmPhaseId, type GmSimPlan, type GmSport,
} from '@/lib/gmCalendar';

const PHASE_EMOJI: Record<GmPhaseId, string> = {
  resign: '✍️', lottery: '🎱', draft: '📋', freeAgency: '🛒', camp: '🏕️',
  cutDown: '✂️', opening: '🚩', deadline: '⏰', playoffs: '🏆',
};
const GAME_EMOJI: Record<GmSport, string> = { nfl: '🏈', nba: '🏀', mlb: '⚾', nhl: '🏒' };
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface GmCalendarPanelProps {
  sport: GmSport;
  /** The day the save sits on. */
  today: CalDate;
  /** Stops only the board knows about: a deal running out, a starter hurt, an inbox ask. */
  hostHalts?: GmHostHalt[];
  /** Runs the plan. Without it the grid is read only. */
  onSim?: (plan: GmSimPlan) => void;
}

export function GmCalendarPanel({ sport, today, hostHalts = [], onSim }: GmCalendarPanelProps) {
  const year = useMemo(() => gmLeagueYear(sport), [sport]);
  const months = useMemo(() => monthsOf(year), [year]);
  const [monthIdx, setMonthIdx] = useState(() => {
    const i = months.findIndex(mo => mo.y === today.y && mo.m === today.m);
    return i >= 0 ? i : 0;
  });
  const [picked, setPicked] = useState<CalDate | null>(null);
  const month = months[Math.min(monthIdx, months.length - 1)];
  const cells = useMemo(() => gmMonthGrid(year, month.y, month.m, today, hostHalts), [year, month, today, hostHalts]);
  const plan = picked ? planSimToDay(year, today, picked, hostHalts) : null;
  const periodWord = year.def.periodName.toLowerCase();

  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-left">
      <p className="text-center font-display text-sm font-bold text-foreground">
        {year.def.label} league year
      </p>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
          disabled={monthIdx <= 0}
          onClick={() => setMonthIdx(i => Math.max(0, i - 1))}
          aria-label="Previous month"
        >
          ◀
        </button>
        <span className="text-xs font-bold text-foreground">{MONTH_NAMES[month.m - 1]} {month.y}</span>
        <button
          type="button"
          className="rounded-lg border border-border px-2 py-1 text-xs disabled:opacity-40"
          disabled={monthIdx >= months.length - 1}
          onClick={() => setMonthIdx(i => Math.min(months.length - 1, i + 1))}
          aria-label="Next month"
        >
          ▶
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w, i) => <span key={i} className="text-[9px] text-muted-foreground">{w}</span>)}
        {cells.map((c, i) => c === null ? <span key={`b${i}`} /> : (
          <button
            key={c.key}
            type="button"
            onClick={() => setPicked(c.date)}
            aria-label={`${shortDate(c.date)}${c.starts.length ? `, ${c.starts.join(', ')}` : ''}${c.halt ? `, stop: ${c.halt.label}` : ''}`}
            className={cn(
              'flex h-10 flex-col items-center justify-start rounded-md border text-[10px] leading-tight',
              c.halt ? 'border-amber-500' : 'border-border/40',
              c.isToday && 'ring-2 ring-primary',
              c.past && 'opacity-50',
              picked && dateKey(picked) === c.key && 'bg-primary/10',
            )}
          >
            <span className="text-muted-foreground">{c.date.d}</span>
            <span className="text-sm">
              {c.starts.length ? c.starts.map(id => PHASE_EMOJI[id]).join('') : c.game ? GAME_EMOJI[sport] : ''}
            </span>
          </button>
        ))}
      </div>

      {picked && (
        <div className="mt-2 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-[11px]">
          {plan === null ? (
            <p className="text-muted-foreground">{shortDate(picked)} is not ahead of today, so there is nothing to sim.</p>
          ) : (
            <>
              <p className="font-bold text-foreground">
                Sim to {shortDate(plan.stopAt)}
                {plan.halt ? `, stopping for ${plan.halt.label}` : ''}
              </p>
              <p className="text-muted-foreground">
                {plan.periods.length === 0
                  ? `No ${periodWord} finishes on the way.`
                  : plan.periods.length === 1
                    ? `Plays ${periodWord} ${plan.periods[0]}.`
                    : `Plays ${periodWord}s ${plan.periods[0]} to ${plan.periods[plan.periods.length - 1]}.`}
              </p>
              {onSim && (
                <button
                  type="button"
                  className="mt-1 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
                  onClick={() => { onSim(plan); setPicked(null); }}
                >
                  Sim
                </button>
              )}
            </>
          )}
        </div>
      )}

      <ul className="mt-2 space-y-0.5">
        {yearSteps(year).map(({ phase }) => (
          <li key={phase.id} className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="text-foreground">{PHASE_EMOJI[phase.id]} {phase.label}</span>
            <span className="text-muted-foreground">
              {shortDate(phase.start)} {phase.start.y}{dateKey(phase.end) !== dateKey(phase.start) ? ` to ${shortDate(phase.end)}` : ''}
              {phase.thin ? ' (expected)' : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-center text-[9px] text-muted-foreground">
        Real {year.def.label} dates. An amber box is a stop that needs you. Expected means fewer than two sources agree yet.
      </p>
    </div>
  );
}
