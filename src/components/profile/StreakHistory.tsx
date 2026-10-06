import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarDays } from 'lucide-react';
import { CATEGORIES } from '@/data/gameRegistry';
import {
  getEtDateString, getStreakState, playCalendar, readDiary, readStreakCounters,
  type DayMark,
} from '@/lib/streaks';
import { formatEtDay } from '@/lib/achievementDates';

/* Round 712: streak history, spec item 15.

   Eight weeks of played days on the player's own profile, overall and per
   game, straight out of src/lib/streaks.ts: the counters plus the play diary
   that sits beside them. This reads and never writes, so opening it cannot
   move the streak it is showing.

   The one rule it has: a day is only ever shown as played or as rest when the
   diary can vouch for it. Days from before this browser kept a diary are drawn
   as unknown (a dashed outline), not as rest, because they may have been
   played and nobody wrote it down.

   Weeks run left to right, oldest first, Monday at the top, so the last column
   holds today. It is a fixed size grid, so it never pushes the page around
   when the pick changes. Marked data-no-prerender because it is a picture of
   today, although the page it sits on needs an account and is never
   photographed anyway. */

const OVERALL = 'overall';
const WEEKS = 8;
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MARK_STYLE: Record<DayMark, string> = {
  played: 'bg-orange-500 border border-orange-400',
  rest: 'bg-muted/40 border border-border/50',
  unknown: 'border border-dashed border-muted-foreground/40 bg-transparent',
  ahead: 'border border-transparent bg-transparent',
};

const MARK_WORDS: Record<DayMark, string> = {
  played: 'played',
  rest: 'nothing played',
  unknown: 'before this device kept a diary',
  ahead: 'still to come',
};

interface StreakHistoryProps {
  /** Labels for old completion slugs that are no longer in the registry. */
  legacyLabels?: Record<string, string>;
}

export default function StreakHistory({ legacyLabels = {} }: StreakHistoryProps) {
  /* One read per mount. Games are finished on game pages, not here. */
  const [snap] = useState(() => ({
    counters: readStreakCounters(),
    live: getStreakState(),
    diary: readDiary(),
    today: getEtDateString(),
  }));
  const [pick, setPick] = useState<string>(OVERALL);

  const games = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      for (const g of cat.games) labels[g.path.replace(/^\//, '')] = `${g.emoji} ${g.label}`;
    }
    const slugs = new Set([...Object.keys(snap.counters.perGame), ...Object.keys(snap.diary?.perGame ?? {})]);
    return [...slugs]
      .map(slug => ({
        slug,
        label: labels[slug] ?? legacyLabels[slug] ?? slug,
        last: snap.counters.perGame[slug]?.lastDate ?? snap.diary?.perGame[slug]?.days.slice(-1)[0] ?? '',
      }))
      .sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : a.label.localeCompare(b.label)));
  }, [snap, legacyLabels]);

  const overall = pick === OVERALL || !games.some(g => g.slug === pick);
  const line = overall ? snap.diary?.global : snap.diary?.perGame[pick];
  const entry = overall ? snap.counters.global : snap.counters.perGame[pick];
  const liveEntry = overall ? snap.live.global : snap.live.perGame[pick];
  const weeks = playCalendar(line, entry, snap.today, WEEKS);
  const days = weeks.flat();
  const played = days.filter(d => d.mark === 'played').length;
  const seen = days.filter(d => d.mark !== 'ahead').length;
  const unknown = days.filter(d => d.mark === 'unknown').length;
  const current = liveEntry?.current ?? 0;
  const best = liveEntry?.longest ?? 0;
  const neverPlayed = !snap.counters.global.lastDate && !(snap.diary?.global.days.length);

  const monthOf = (day: string) => MONTHS[Number(day.slice(5, 7)) - 1] ?? '';
  const describe = (day: string, mark: DayMark, i: number) =>
    `${DAY_NAMES[i]} ${formatEtDay(day)}: ${MARK_WORDS[mark]}${day === snap.today ? ' (today)' : ''}`;

  return (
    <Card className="border-border/60" data-no-prerender data-streak-history>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-orange-500" /> Last 8 weeks
          </CardTitle>
          {games.length > 0 && (
            <Select value={overall ? OVERALL : pick} onValueChange={setPick}>
              <SelectTrigger className="h-9 w-[200px] max-w-full text-xs" aria-label="Show the history for">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OVERALL}>🔥 Any game</SelectItem>
                {games.map(g => (
                  <SelectItem key={g.slug} value={g.slug}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug" data-streak-summary>
          {neverPlayed
            ? 'Finish any game and your days start filling in here.'
            : `Played ${played} of the last ${seen - unknown} days${unknown > 0 ? ' on record' : ''}. ${current > 0 ? `${current} in a row right now` : 'No run going right now'}, best ever ${best}.`}
          {' '}Counted on this device only. The streak tiles above count your account too, so they can be higher.
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div
          className="grid gap-1 max-w-[360px]"
          style={{ gridTemplateColumns: `14px repeat(${WEEKS}, minmax(0, 1fr))` }}
          role="img"
          aria-label={neverPlayed ? 'No days played yet' : `Played ${played} of the last ${seen - unknown} days${unknown > 0 ? ' on record' : ''}`}
        >
          <span />
          {weeks.map((week, w) => {
            const first = week[0].day;
            const show = w === 0 || monthOf(first) !== monthOf(weeks[w - 1][0].day);
            return (
              <span key={`m${first}`} className="text-[9px] text-muted-foreground leading-none h-3 whitespace-nowrap overflow-visible">
                {show ? monthOf(first) : ''}
              </span>
            );
          })}
          {DAY_LETTERS.map((letter, d) => (
            <DayRow key={d} letter={letter}>
              {weeks.map(week => {
                const cell = week[d];
                return (
                  <span
                    key={cell.day}
                    data-day={cell.day}
                    data-mark={cell.mark}
                    title={cell.mark === 'ahead' ? undefined : describe(cell.day, cell.mark, d)}
                    className={`aspect-square rounded-[4px] ${MARK_STYLE[cell.mark]} ${
                      cell.day === snap.today ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
                    }`}
                  />
                );
              })}
            </DayRow>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] text-muted-foreground">
          <Legend mark="played" words="Played" />
          <Legend mark="rest" words="Nothing played" />
          {unknown > 0 && <Legend mark="unknown" words="Before this device kept a diary" />}
        </div>
      </CardContent>
    </Card>
  );
}

/** A row of the grid is its letter plus eight cells, laid straight into the
 *  parent grid so every column lines up with its month label. */
function DayRow({ letter, children }: { letter: string; children: ReactNode }) {
  return (
    <>
      <span className="text-[9px] text-muted-foreground leading-none self-center">{letter}</span>
      {children}
    </>
  );
}

function Legend({ mark, words }: { mark: DayMark; words: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-[3px] ${MARK_STYLE[mark]}`} />
      {words}
    </span>
  );
}
