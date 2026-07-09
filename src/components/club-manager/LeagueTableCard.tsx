import { cn } from '@/lib/utils';
import type { TableRow } from '@/lib/clubManager';

interface LeagueTableCardProps {
  rows: TableRow[];
  myClub: string;
  /** Show only a slice of rows centered on my club (for the overview tab). */
  compact?: boolean;
  title?: string;
}

/**
 * League (or UCL group) standings. Top 4 = UCL zone marker, 1st = title.
 */
export function LeagueTableCard({ rows, myClub, compact = false, title }: LeagueTableCardProps) {
  const myIdx = rows.findIndex(r => r.club === myClub);
  let visible = rows.map((r, i) => ({ r, pos: i + 1 }));
  if (compact) {
    const lo = Math.max(0, Math.min(myIdx - 2, rows.length - 5));
    visible = visible.slice(lo, lo + 5);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
      {title && <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{title}</div>}
      <div className="grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_1.6rem_2rem_2.2rem] gap-x-1 text-[10px] text-muted-foreground uppercase tracking-wide pb-1 border-b border-border/60">
        <span>#</span><span>Club</span><span className="text-center">W</span><span className="text-center">D</span><span className="text-center">L</span><span className="text-center">GD</span><span className="text-right">Pts</span>
      </div>
      {visible.map(({ r, pos }) => {
        const mine = r.club === myClub;
        const gd = r.gf - r.ga;
        return (
          <div
            key={r.club}
            className={cn(
              'grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_1.6rem_2rem_2.2rem] gap-x-1 items-center text-xs py-1.5 border-b border-border/30 last:border-0',
              mine && 'bg-primary/10 rounded-md -mx-1 px-1',
            )}
          >
            <span className={cn(
              'font-bold',
              pos === 1 ? 'text-gold' : pos <= 4 ? 'text-emerald-400' : 'text-muted-foreground',
            )}>{pos}</span>
            <span className={cn('truncate', mine ? 'text-primary font-bold' : 'text-foreground')}>{r.club}</span>
            <span className="text-center text-muted-foreground">{r.w}</span>
            <span className="text-center text-muted-foreground">{r.d}</span>
            <span className="text-center text-muted-foreground">{r.l}</span>
            <span className={cn('text-center', gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-red-400' : 'text-muted-foreground')}>
              {gd > 0 ? `+${gd}` : gd}
            </span>
            <span className="text-right font-bold text-foreground">{r.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

export default LeagueTableCard;
