import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import { leagueOf } from '@/lib/clubManager';
import type { CareerState, CalendarEntry } from '@/lib/clubManager';

/** Round 73: the season at a glance. Recent results plus what's coming. */
export function CalendarCard({ career }: { career: CareerState }) {
  const [expanded, setExpanded] = useState(false);

  const played = career.resultLog ?? [];
  const recent = played.slice(-3);

  const upcoming = useMemo(() => {
    const league = leagueOf(career.clubName);
    const out: { label: string; detail: string }[] = [];
    for (let w = career.week; w < career.calendar.length && out.length < (expanded ? 14 : 5); w++) {
      const entry: CalendarEntry = career.calendar[w];
      if (entry.type === 'window') {
        out.push({ label: '❄️ January window', detail: 'Do your business' });
      } else if (entry.type === 'league') {
        out.push({ label: `${league.name} R${entry.round + 1}`, detail: leagueOpponentFor(career, entry.round) });
      } else if (entry.type === 'cup' && entry.cupRound) {
        if (career.cupRound !== 'out' && career.cupRound !== 'won') {
          const opp = career.cupDraw[entry.cupRound];
          out.push({
            label: `🏅 ${league.cupName} ${entry.cupRound === 'F' ? 'Final' : entry.cupRound}`,
            detail: opp ?? 'Draw to come',
          });
        }
      } else if (entry.type === 'uclGroup' && career.uclGroup && career.uclKoRound === null) {
        out.push({ label: `⭐ UCL Group MD${entry.round + 1}`, detail: career.uclGroup.opponents[entry.round % 3] ?? '' });
      } else if (entry.type === 'uclKo' && entry.uclRound && career.uclKoRound === entry.uclRound) {
        out.push({
          label: `⭐ UCL ${entry.uclRound === 'F' ? 'Final' : entry.uclRound}`,
          detail: career.uclDraw[entry.uclRound] ?? 'Draw to come',
        });
      }
    }
    return out;
  }, [career, expanded]);

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          <CalendarDays className="w-3 h-3" /> Season calendar
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {recent.length > 0 && (
        <div className="mb-1.5 space-y-0.5">
          {recent.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className={cn(
                'w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0',
                r.res === 'W' ? 'bg-emerald-500/20 text-emerald-400' : r.res === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400',
              )}>
                {r.res}
              </span>
              <span className="text-foreground font-semibold">{r.score}</span>
              <span className="text-muted-foreground truncate">{r.home === false ? 'at' : 'vs'} {r.opp}</span>
              <span className="text-[9px] text-muted-foreground/70 ml-auto shrink-0 truncate max-w-[90px]">{r.comp.split('·')[0]}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-0.5 border-t border-border/40 pt-1.5">
        {upcoming.map((u, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className={cn('shrink-0', i === 0 ? 'text-primary font-bold' : 'text-muted-foreground')}>{u.label}</span>
            <span className="text-foreground truncate ml-auto">{u.detail}</span>
          </div>
        ))}
        {upcoming.length === 0 && <p className="text-[11px] text-muted-foreground">Season complete.</p>}
      </div>
    </div>
  );
}

/** My league opponent for a given round, home/away tagged. */
function leagueOpponentFor(career: CareerState, round: number): string {
  // The engine's pairing function is private; recompute the same circle
  // method here for display only.
  const clubs = career.leagueClubs;
  const list = clubs.length % 2 === 0 ? clubs : [...clubs, '__BYE__'];
  const n = list.length;
  const r = round % (n - 1);
  const rest = list.slice(1);
  const rot = [...rest.slice(r), ...rest.slice(0, r)];
  const arr = [list[0], ...rot];
  for (let i = 0; i < n / 2; i++) {
    let h = arr[i];
    let a = arr[n - 1 - i];
    if ((r + i) % 2 === 1) [h, a] = [a, h];
    if (round >= n - 1) [h, a] = [a, h];
    if (h === career.clubName) return a === '__BYE__' ? 'Bye week' : `${a} (H)`;
    if (a === career.clubName) return h === '__BYE__' ? 'Bye week' : `${h} (A)`;
  }
  return 'Bye week';
}

export default CalendarCard;
