/**
 * Round 1223: a GM's career, the screen behind the Career box.
 *
 * One small box for every club he has run, oldest first, with a mark for each
 * graded season and how it ended. A record built from a save older than the
 * record itself says so honestly: the seasons before it began are a count,
 * never a guessed grade, and the tier on arrival is left off because nobody
 * knows it. Every word comes from src/lib/gmDeskHost.ts. Reading this panel
 * writes nothing. Not mounted by this round.
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { GmPanelProps } from '@/lib/gmDesk';
import { hostCareerHelp, hostCareerTotalsLine, hostStintViews, type GmCareerFacts } from '@/lib/gmDeskHost';

export default function GmCareerPanel({ facts }: GmPanelProps<GmCareerFacts>) {
  const { pack, seat, nameOf } = facts.career;
  const [help, setHelp] = useState(false);
  const stints = hostStintViews(seat, nameOf);

  return (
    <div className="space-y-2" data-gm-career>
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[11px] font-bold text-foreground" data-gm-career-totals>{hostCareerTotalsLine(seat)}</p>
          <button
            type="button"
            onClick={() => setHelp(h => !h)}
            aria-expanded={help}
            aria-label="How the career record works"
            className="min-h-[44px] min-w-[44px] rounded-full border border-border text-xs text-muted-foreground hover:text-foreground"
          >
            ?
          </button>
        </div>
        {help && (
          <div className="mt-2 space-y-1 rounded-lg border border-border bg-secondary/30 p-2 text-[10px] text-muted-foreground" data-gm-career-help>
            {hostCareerHelp(pack).map(line => <p key={line}>{line}</p>)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5" data-gm-stints>
        {stints.map((s, i) => (
          <div
            key={`${s.team}:${i}`}
            data-gm-stint={s.team}
            className={cn('rounded-lg border p-2', s.ended === 'Still here' ? 'border-gold/50 bg-gold/5' : 'border-border bg-secondary/20')}
          >
            <div className="truncate text-xs font-bold text-foreground">{s.name}</div>
            <div className="text-[9px] text-muted-foreground">{s.arrival}</div>
            <div className="mt-1 min-h-[14px] break-words text-[11px] leading-none text-foreground" data-gm-marks>
              {s.marks.length > 0 ? s.marks.join(' ') : 'No graded season yet'}
            </div>
            {s.earlier && <div className="mt-1 text-[9px] text-muted-foreground" data-gm-earlier>{s.earlier}</div>}
            <div className="mt-1 text-[9px] uppercase tracking-wider text-muted-foreground">{s.ended}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
