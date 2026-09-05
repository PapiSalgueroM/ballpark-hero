import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronLeft, ChevronRight, FastForward } from 'lucide-react';
import { INTENSITY_INFO } from '@/lib/clubManager';
import type { CareerState, TrainingPlan, TrainingIntensity } from '@/lib/clubManager';
import {
  seasonDays, monthGrid, fastForwardTargets, targetWeekForDate, dayEmoji, clubTag, shortDate,
  MONTH_NAMES, WINDOW_MATCH_WEEKS,
} from '@/lib/clubManagerCalendar';
import type { CalendarDay, FastForward as FastForwardTarget } from '@/lib/clubManagerCalendar';
import { useRevealScroll } from '@/hooks/useRevealScroll';

/**
 * Round 158: the season as a real month calendar, off the phone calendar
 * screenshot he sent. Fixtures sit on their dates, played ones wear their
 * result, training days carry a cone, the window and its deadline are
 * marked, and the fast forward can jump a match, a run of matches, or the
 * whole rest of the season.
 *
 * Round 466, his words: "click any day and sim to it (keep the four fast
 * forwards), bigger emojis, match days name the opponent, transfer window
 * open and close clearly marked." Every day is a button now. Tapping one
 * opens a strip that says what the day holds and offers to sim to it; the
 * four fast forwards are the same tap on a chosen day, so the two go through
 * one loop (src/lib/clubManagerCalendar.ts, simToWeek). Match days carry the
 * opponent's tag on the cell and the full name on the strip and in the
 * month list under the grid, and both windows are drawn open from the day
 * they open to the padlock on deadline day.
 *
 * Everything the grid shows is derived from the save by that module; this
 * file holds no state beyond which month the eye is on and which day is
 * selected.
 */

/** A tiny training cone, drawn, because there is no cone emoji. */
function Cone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={cn('w-2.5 h-2.5', className)} aria-hidden="true">
      <polygon points="5,1 7.4,7.4 2.6,7.4" fill="#f97316" />
      <rect x="1.4" y="7.4" width="7.2" height="1.4" rx="0.7" fill="#fb923c" />
      <rect x="3.6" y="4.4" width="2.8" height="1" fill="#fff7ed" />
    </svg>
  );
}

const POLICY_LABEL: Record<TrainingIntensity, { label: string; blurb: string }> = {
  light: { label: 'Rest first', blurb: 'Two light sessions. Freshest legs on Saturday, slowest growth.' },
  normal: { label: 'Balanced', blurb: 'Train one day, rest the next. The default rhythm.' },
  double: { label: 'Full training', blurb: 'On the grass every weekday. Fastest growth, tired legs and knocks.' },
};

/** "vs Everton", "at Everton", or the neutral "v Everton". */
function venueLine(day: CalendarDay): string {
  if (day.potential) return 'if you get there';
  const opp = day.opponent ?? 'draw to come';
  if (day.opponent === null) return opp;
  return `${day.home === true ? 'vs' : day.home === false ? 'at' : 'v'} ${opp}`;
}

/** What a day holds, in one line, for the strip and the cell's title. */
function dayLine(day: CalendarDay): string {
  if (day.kind === 'window') return 'January window opens';
  if (day.kind === 'match') {
    if (day.potential) return `${day.compLabel ?? ''}, if you get there`;
    const played = day.res ? ` · ${day.res} ${day.score}` : '';
    return `${venueLine(day)} · ${day.compLabel ?? ''}${played}`;
  }
  return day.kind === 'training' ? 'Training day' : 'Rest day';
}

const WINDOW_NAME: Record<'summer' | 'january', string> = { summer: 'summer', january: 'January' };

interface CalendarScreenProps {
  career: CareerState;
  /** Sim the save forward to a calendar index, through the hook's one loop. */
  onSimTo: (targetWeek: number) => void;
  onSetTraining: (plan: TrainingPlan) => void;
}

export function CalendarScreen({ career, onSimTo, onSetTraining }: CalendarScreenProps) {
  const c = career;
  const days = useMemo(() => seasonDays(c), [c]);
  const intensity: TrainingIntensity = c.training?.intensity ?? 'normal';
  const [view, setView] = useState<{ y: number; m: number }>({ y: days.today.y, m: days.today.m });
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  const grid = useMemo(() => monthGrid(days, view.y, view.m, intensity), [days, view, intensity]);
  const ff = useMemo(() => fastForwardTargets(c, days), [c, days]);

  const selected = useMemo(
    () => (selectedKey === null ? null : grid.find(cell => cell !== null && cell.key === selectedKey) ?? null),
    [grid, selectedKey],
  );
  const selectedTarget = selected ? targetWeekForDate(days.entryDates, c.week, selected.date) : null;
  /* What a sim to the selected day would play: every match day between now and it. */
  const matchesToSelected = useMemo(() => {
    if (selectedTarget === null) return 0;
    let n = 0;
    for (const day of days.entryDays.values()) {
      if (day.kind === 'match' && !day.potential && day.weekIdx !== null && day.weekIdx >= c.week && day.weekIdx < selectedTarget) n += 1;
    }
    return n;
  }, [days, c.week, selectedTarget]);
  /* The strip appears under the grid; on a phone that can sit below the fold. */
  const stripRef = useRevealScroll<HTMLDivElement>(`cal-day:${selectedKey ?? ''}`, { skipFirst: true });

  /* The window a selected day sits inside, for the strip's second line. */
  const windowLine = useMemo(() => {
    if (!selected || !selected.windowOpen) return null;
    const span = days.windows.find(w => {
      const open = w.kind === 'summer' ? days.seasonStart : days.entryDates[w.openWeek];
      const close = w.deadlineWeek !== null ? days.entryDates[w.deadlineWeek] : open;
      const k = selected.key;
      const openKey = open.y * 10000 + open.m * 100 + open.d;
      const closeKey = close.y * 10000 + close.m * 100 + close.d;
      return k >= openKey && k <= closeKey;
    });
    if (!span) return null;
    const close = span.deadlineWeek !== null ? days.entryDates[span.deadlineWeek] : null;
    if (selected.deadline) {
      return `Deadline day for the ${WINDOW_NAME[selected.deadline]} window: the market shuts at the final whistle.`;
    }
    return close
      ? `The ${WINDOW_NAME[span.kind]} window is open. Deadline day is ${shortDate(close)}, your ${span.kind === 'summer' ? WINDOW_MATCH_WEEKS.summer : WINDOW_MATCH_WEEKS.january}${span.kind === 'summer' ? 'th' : 'rd'} match${span.kind === 'january' ? ' after it opens' : ' of the season'}.`
      : `The ${WINDOW_NAME[span.kind]} window is open.`;
  }, [selected, days]);

  /* Month stepping, bounded to the season's span. */
  const monthKey = (y: number, m: number) => y * 100 + m;
  const canPrev = monthKey(view.y, view.m) > monthKey(days.seasonStart.y, days.seasonStart.m);
  const canNext = monthKey(view.y, view.m) < monthKey(days.seasonEnd.y, days.seasonEnd.m);
  const step = (dir: 1 | -1) => {
    setView(v => {
      let m = v.m + dir;
      let y = v.y;
      if (m > 12) { m = 1; y += 1; }
      if (m < 1) { m = 12; y -= 1; }
      return { y, m };
    });
    setSelectedKey(null);
  };

  /* The month's match and window days, for the list under the grid. */
  const monthEntries = useMemo(
    () => grid.filter((cell): cell is CalendarDay => cell !== null && (cell.kind === 'match' || cell.kind === 'window')),
    [grid],
  );

  const weeksLeft = c.calendar.length - c.week;

  const ffButton = (label: string, target: FastForwardTarget | null, gold = false) => {
    if (!target) return null;
    return (
      <button
        key={label}
        onClick={() => onSimTo(target.week)}
        className={cn(
          'rounded-lg border px-2 py-1.5 text-left transition-colors',
          gold ? 'border-gold/50 bg-gold/10 hover:bg-gold/20' : 'border-border bg-background hover:border-primary/60',
        )}
      >
        <span className={cn('block text-[11px] font-bold', gold ? 'text-gold' : 'text-foreground')}>{label}</span>
        <span className="block text-[9px] text-muted-foreground">{shortDate(target.date)}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Month header and grid */}
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
        <div className="grid grid-cols-7 gap-0.5" data-testid="cm-calendar-grid">
          {grid.map((cell, i) => {
            if (!cell) return <div key={i} />;
            const isSelected = selectedKey === cell.key;
            const emoji = dayEmoji(cell);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedKey(cell.key)}
                aria-label={`${shortDate(cell.date)}: ${dayLine(cell)}`}
                aria-pressed={isSelected}
                title={dayLine(cell)}
                className={cn(
                  'relative rounded-md min-h-[46px] flex flex-col items-center justify-start pt-0.5 pb-0.5 border overflow-hidden transition-colors',
                  cell.isToday ? 'border-primary bg-primary/10' : 'border-transparent',
                  cell.kind === 'match' && !cell.isToday && !cell.windowOpen && 'bg-secondary/60',
                  cell.windowOpen && !cell.isToday && 'bg-gold/10',
                  cell.kind === 'window' && 'border-gold/60',
                  cell.deadline && 'border-red-500/60',
                  isSelected && 'ring-2 ring-primary',
                  cell.past && !isSelected && 'opacity-55',
                )}
              >
                <span className={cn('text-[9px] leading-none', cell.isToday ? 'text-primary font-bold' : 'text-foreground')}>{cell.date.d}</span>
                {emoji && <span className={cn('text-[15px] leading-none mt-0.5', cell.potential && 'opacity-40')} aria-hidden="true">{emoji}</span>}
                {cell.kind === 'match' && cell.potential && (
                  <span className="mt-0.5 text-[8px] leading-none text-muted-foreground">if…</span>
                )}
                {cell.kind === 'match' && !cell.potential && (
                  cell.res ? (
                    <span className={cn(
                      'mt-0.5 px-1 rounded-full text-[8px] font-bold leading-[12px]',
                      cell.res === 'W' ? 'bg-emerald-500/25 text-emerald-400' : cell.res === 'D' ? 'bg-yellow-500/25 text-yellow-400' : 'bg-red-500/25 text-red-400',
                    )}>
                      {cell.res} {cell.score}
                    </span>
                  ) : (
                    <span className="mt-0.5 text-[8px] font-semibold leading-none text-foreground/90 tracking-tight">
                      {cell.opponent ? `${cell.home === false ? '@' : 'v'} ${clubTag(cell.opponent)}` : 'TBC'}
                    </span>
                  )
                )}
                {cell.kind === 'training' && <Cone className="mt-1.5" />}
                {cell.deadline && <span className="absolute top-0 right-0 text-[10px] leading-none" aria-hidden="true">🔒</span>}
              </button>
            );
          })}
        </div>

        {/* The tapped day: what it holds, and the button that sims to it. */}
        {selected && (
          <div ref={stripRef} className="mt-2 rounded-lg border border-primary/40 bg-primary/5 p-2" data-testid="cm-calendar-day">
            <div className="text-[11px] font-bold text-foreground">{shortDate(selected.date)}{selected.isToday ? ' · today' : ''}</div>
            <div className="text-[11px] text-foreground/90">{dayEmoji(selected) ? `${dayEmoji(selected)} ` : ''}{dayLine(selected)}</div>
            {windowLine && <div className="text-[10px] text-gold mt-0.5">{selected.deadline ? '🔒' : '🔓'} {windowLine}</div>}
            <div className="mt-1.5 flex items-center gap-2">
              {selectedTarget !== null ? (
                <button
                  onClick={() => onSimTo(selectedTarget)}
                  className="rounded-lg border border-primary bg-primary/15 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/25 transition-colors"
                >
                  Sim to {shortDate(selected.date)}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  {selected.past || (selected.kind === 'match' && selected.res) ? 'Already played.' : 'Nothing to play before then.'}
                </span>
              )}
              {selectedTarget !== null && (
                <span className="text-[9px] text-muted-foreground">
                  {matchesToSelected === 0 ? 'no match on the way' : matchesToSelected === 1 ? 'plays 1 match' : `plays ${matchesToSelected} matches`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Every match and window day of the month, with the full names. */}
        {monthEntries.length > 0 && (
          <div className="mt-2 space-y-0.5 border-t border-border/40 pt-1.5" data-testid="cm-calendar-month-list">
            {monthEntries.map(day => (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedKey(day.key)}
                className={cn(
                  'w-full flex items-center gap-1.5 text-[11px] rounded px-1 py-0.5 text-left hover:bg-secondary/60 transition-colors',
                  selectedKey === day.key && 'bg-primary/10',
                  day.past && 'opacity-70',
                )}
              >
                <span className="w-12 shrink-0 text-muted-foreground">{shortDate(day.date)}</span>
                <span className="shrink-0" aria-hidden="true">{dayEmoji(day)}</span>
                <span className={cn('truncate', day.potential ? 'text-muted-foreground italic' : 'text-foreground')}>
                  {day.kind === 'window' ? 'January window opens' : venueLine(day)}
                </span>
                {day.deadline && <span className="shrink-0 text-[9px] text-red-400 font-bold">🔒 deadline</span>}
                {day.res ? (
                  <span className={cn(
                    'ml-auto shrink-0 px-1.5 rounded-full text-[9px] font-bold',
                    day.res === 'W' ? 'bg-emerald-500/20 text-emerald-400' : day.res === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400',
                  )}>
                    {day.res} {day.score}
                  </span>
                ) : (
                  <span className="ml-auto shrink-0 text-[9px] text-muted-foreground truncate max-w-[88px]">
                    {day.kind === 'match' ? (day.compLabel ?? '').split(' · ')[0] : ''}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-[8px] text-muted-foreground">
          <span>⚽ league match day</span>
          <span>🏅 cup</span>
          <span>⭐ Europe</span>
          <span className="inline-flex items-center gap-0.5"><Cone /> training</span>
          <span>🔓 window opens</span>
          <span>🔒 deadline day</span>
          <span><span className="inline-block w-2 h-2 rounded-sm bg-gold/30 align-middle" /> window open</span>
          <span>faded: a round you reach by winning the one before</span>
          <span>Season: {MONTH_NAMES[days.seasonStart.m - 1]} {days.seasonStart.y} to {MONTH_NAMES[days.seasonEnd.m - 1]} {days.seasonEnd.y}</span>
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

      {/* Fast forward: four taps on chosen days. */}
      {weeksLeft > 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <FastForward className="w-3 h-3" /> Fast forward
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {ffButton('Next match', ff.nextMatch)}
            {ffButton('About a month', ff.aboutAMonth)}
            {ffButton('To the window', ff.toWindow)}
            {ffButton('Rest of season', ff.restOfSeason, true)}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            Each one is a tap on the day shown, so it runs exactly what tapping that day runs. Every run stops early for the January window, the season review, the sack and a club's approach, because those need you. The last match simmed shows its full report.
          </p>
        </div>
      )}
    </div>
  );
}

export default CalendarScreen;
