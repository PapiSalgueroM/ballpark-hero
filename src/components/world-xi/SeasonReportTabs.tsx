import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SeasonReport } from '@/lib/worldXi';

/**
 * Round 726: the month by month form line and the per player season stats,
 * behind two small toggles under the season report so the result card stays
 * a card and not a scroll (the tile rule). Both World XI and Build Your XI
 * mount this below the narrative, so the two pages keep showing one report.
 *
 * A report built before this round has neither list and renders nothing
 * here, which is the whole of the backwards compatibility: the fields are
 * optional on SeasonReport and this reads them as such.
 */
type Panel = 'months' | 'players';

const POSITION_ORDER = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];

interface SeasonReportTabsProps {
  report: SeasonReport;
  className?: string;
  /** Which panel starts open. Both start closed on the page; the harness renders each open. */
  initialPanel?: Panel | null;
}

export function SeasonReportTabs({ report, className, initialPanel = null }: SeasonReportTabsProps) {
  const [open, setOpen] = useState<Panel | null>(initialPanel);
  const months = report.months ?? [];
  const stats = report.playerStats ?? [];
  if (months.length === 0 && stats.length === 0) return null;

  const toggle = (panel: Panel) => setOpen(current => (current === panel ? null : panel));
  const ordered = [...stats].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position) || b.avgRating - a.avgRating);

  return (
    <div className={cn('mt-4', className)}>
      <div className="flex flex-wrap justify-center gap-2">
        {months.length > 0 && (
          <button
            type="button"
            onClick={() => toggle('months')}
            aria-expanded={open === 'months'}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold transition-all',
              open === 'months' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/40 text-foreground border-border hover:border-primary/40',
            )}
          >
            Month by month
          </button>
        )}
        {stats.length > 0 && (
          <button
            type="button"
            onClick={() => toggle('players')}
            aria-expanded={open === 'players'}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold transition-all',
              open === 'players' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/40 text-foreground border-border hover:border-primary/40',
            )}
          >
            Player stats
          </button>
        )}
      </div>

      {open === 'months' && (
        <div className="mt-3 grid gap-1.5 text-left">
          {months.map(m => (
            <div key={m.month} className="bg-background/60 border border-border/50 rounded-lg px-3 py-2">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="font-bold text-foreground w-9 shrink-0">{m.month.slice(0, 3)}</span>
                <span className="text-foreground/90">{m.wins}W {m.draws}D {m.losses}L</span>
                <span className="text-muted-foreground text-xs">{m.goalsFor}-{m.goalsAgainst}</span>
                {m.standout && (
                  <span className="ml-auto text-xs text-muted-foreground truncate min-w-0">
                    Standout: <span className="text-foreground/90 font-semibold">{m.standout.name}</span>
                    {m.standout.goals + m.standout.assists > 0
                      ? ` ${m.standout.goals}G ${m.standout.assists}A`
                      : m.standout.cleanSheets > 0
                      ? ` ${m.standout.cleanSheets} clean sheet${m.standout.cleanSheets === 1 ? '' : 's'}`
                      : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{m.moment}</p>
            </div>
          ))}
        </div>
      )}

      {open === 'players' && (
        <div className="mt-3 rounded-lg border border-border/50 bg-background/60 overflow-hidden text-left">
          <div className="grid grid-cols-[2.4rem_1fr_2.2rem_2rem_2rem_2rem_2.6rem] gap-1 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
            <span>Pos</span>
            <span>Player</span>
            <span className="text-right">App</span>
            <span className="text-right">G</span>
            <span className="text-right">A</span>
            <span className="text-right">CS</span>
            <span className="text-right">Avg</span>
          </div>
          {ordered.map(p => (
            <div key={p.name} className="grid grid-cols-[2.4rem_1fr_2.2rem_2rem_2rem_2rem_2.6rem] gap-1 px-3 py-1.5 text-xs border-b border-border/30 last:border-b-0">
              <span className="font-bold text-muted-foreground">{p.position}</span>
              <span className="font-semibold text-foreground truncate min-w-0">{p.name}</span>
              <span className="text-right text-foreground/90">{p.appearances}</span>
              <span className="text-right text-foreground/90">{p.goals}</span>
              <span className="text-right text-foreground/90">{p.assists}</span>
              <span className="text-right text-foreground/90">{p.cleanSheets ?? '-'}</span>
              <span className="text-right text-foreground/90">{p.avgRating.toFixed(1)}</span>
            </div>
          ))}
          <p className="px-3 py-1.5 text-[10px] text-muted-foreground">
            Goals and assists add up to the team's. CS (keeper and back line) counts the clean sheets in the games each man played. Avg is the sim's match rating out of 10.
          </p>
        </div>
      )}
    </div>
  );
}
