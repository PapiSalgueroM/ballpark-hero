import { cn } from '@/lib/utils';
import type { TableRow } from '@/lib/clubManager';

interface LeagueTableCardProps {
  rows: TableRow[];
  myClub: string;
  /** Show only a slice of rows centered on my club (for the overview tab). */
  compact?: boolean;
  title?: string;
  /** Round 163: zero games played, alphabetical order, my club starred,
   *  position colors off because the numbers mean nothing yet. */
  preseason?: boolean;
  /** Round 74: tap any club to open its detail screen (the rival viewer). */
  onClubClick?: (club: string) => void;
  /** Round 462: how level points were split, printed under the rows. */
  footnote?: string;
}

/**
 * League (or UCL group) standings. Top 4 = UCL zone marker, 1st = title.
 */
export function LeagueTableCard({ rows, myClub, compact = false, title, preseason = false, onClubClick, footnote }: LeagueTableCardProps) {
  const myIdx = rows.findIndex(r => r.club === myClub);
  let visible = rows.map((r, i) => ({ r, pos: i + 1 }));
  if (compact) {
    const lo = Math.max(0, Math.min(myIdx - 2, rows.length - 5));
    visible = visible.slice(lo, lo + 5);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
      {title && <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{title}</div>}
      <div className="grid grid-cols-[1.3rem_1fr_1.3rem_1.3rem_1.3rem_2.6rem_1.9rem_2rem] gap-x-1 text-[10px] text-muted-foreground uppercase tracking-wide pb-1 border-b border-border/60">
        <span>#</span><span>Club</span><span className="text-center">W</span><span className="text-center">D</span><span className="text-center">L</span><span className="text-center">GF-GA</span><span className="text-center">GD</span><span className="text-right">Pts</span>
      </div>
      {onClubClick && (
        <p className="text-[9px] text-muted-foreground pt-1">Tap any club to scout their full squad.</p>
      )}
      {visible.map(({ r, pos }) => {
        const mine = r.club === myClub;
        const gd = r.gf - r.ga;
        return (
          <div
            key={r.club}
            onClick={onClubClick ? () => onClubClick(r.club) : undefined}
            className={cn(
              'grid grid-cols-[1.3rem_1fr_1.3rem_1.3rem_1.3rem_2.6rem_1.9rem_2rem] gap-x-1 items-center text-xs py-1.5 border-b border-border/30 last:border-0',
              mine && 'bg-primary/10 rounded-md -mx-1 px-1',
              onClubClick && 'cursor-pointer hover:bg-secondary/40 rounded-md -mx-1 px-1 transition-colors',
            )}
          >
            <span className={cn(
              'font-bold',
              preseason ? 'text-muted-foreground' : pos === 1 ? 'text-gold' : pos <= 4 ? 'text-emerald-400' : 'text-muted-foreground',
            )}>{preseason ? '·' : pos}</span>
            <span className={cn('truncate', mine ? 'text-primary font-bold' : 'text-foreground')}>{preseason && mine ? '⭐ ' : ''}{r.club}</span>
            <span className="text-center text-muted-foreground">{r.w}</span>
            <span className="text-center text-muted-foreground">{r.d}</span>
            <span className="text-center text-muted-foreground">{r.l}</span>
            {/* Round 465, his words: "show goals for and against as 25-23
                alongside GD". The pair is the row's own gf and ga, so the
                difference beside it is always what these two make. */}
            <span className="text-center text-muted-foreground text-[11px] tabular-nums" data-goals={`${r.gf}-${r.ga}`}>{r.gf}-{r.ga}</span>
            <span className={cn('text-center', gd > 0 ? 'text-emerald-400' : gd < 0 ? 'text-red-400' : 'text-muted-foreground')}>
              {gd > 0 ? `+${gd}` : gd}
            </span>
            <span className="text-right font-bold text-foreground">{r.pts}</span>
          </div>
        );
      })}
      {footnote && (
        <p className="text-[9px] text-muted-foreground pt-1.5">{footnote}</p>
      )}
    </div>
  );
}

export default LeagueTableCard;
