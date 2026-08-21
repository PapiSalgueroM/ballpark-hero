/**
 * Round 208: the trophy case, one screen, four games.
 *
 * Every award these games hand out has always been recorded on the season
 * line, and until now the only thing that ever read it was a single trophy
 * emoji at the end of a row in the career log. So a career with three MVPs
 * and two rings looked exactly like a career with three good seasons.
 *
 * This reads the seasons themselves rather than the career counters, so
 * what it shows is what actually happened, and every honour carries the
 * years it was won in.
 */
import { Trophy } from 'lucide-react';
import { trophyLines } from '@/lib/careerHub';
import { cn } from '@/lib/utils';

interface Props {
  seasons: { year: number; awards: string[] }[];
  rings: number;
  /** The sport's word for its championship. */
  ringWord: string;
}

export default function TrophyCase({ seasons, rings, ringWord }: Props) {
  const lines = trophyLines(seasons);
  const total = lines.reduce((n, l) => n + l.n, 0);
  return (
    <div className="space-y-2" data-trophy-case>
      <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">
          <Trophy className="mr-1 inline h-4 w-4 text-gold" />
          {rings} {rings === 1 ? ringWord : `${ringWord}s`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {total === 0
            ? 'Nothing on the shelf yet. Every award you win lands here with the year on it.'
            : `${total} individual ${total === 1 ? 'honour' : 'honours'} across ${seasons.length} ${seasons.length === 1 ? 'season' : 'seasons'}.`}
        </p>
      </div>

      {lines.length === 0 ? null : (
        <div className="space-y-1.5">
          {lines.map(l => (
            <div key={l.label} className="rounded-xl border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold text-foreground">{l.label}</span>
                <span className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black',
                  l.n >= 3 ? 'bg-gold/20 text-gold' : 'bg-secondary text-muted-foreground',
                )}>
                  x{l.n}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{l.years.join(', ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
