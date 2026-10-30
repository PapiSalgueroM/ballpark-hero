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
 *
 * Round 530: the rows tick in one after the other when the case opens,
 * keyed on the honour so a new one animates and the rest hold still.
 * Reduced motion lands every row on its final frame (CelebrationStyles).
 */
import { Trophy } from 'lucide-react';
import { CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
import { trophyLines } from '@/lib/careerHub';
import { cn } from '@/lib/utils';

interface Props {
  seasons: { year: number; awards: string[] }[];
  rings: number;
  /** The sport's word for its championship. */
  ringWord: string;
  /** Round 1557: rows from outside the seasons (the medals of the summers
   *  with the national team), drawn after the awards in the same markup.
   *  A medal is a team's and a summer's, so the honours line above does not
   *  count it; each row says its own count. Absent, nothing changes. */
  extra?: { label: string; n: number; years: number[] }[];
  /** Round 1557: one tile under the rows that opens the summers (the board
   *  answers it with its own screen and Back). Absent, no tile. */
  intlTile?: { sub: string; onOpen: () => void };
}

export default function TrophyCase({ seasons, rings, ringWord, extra, intlTile }: Props) {
  const lines = trophyLines(seasons);
  const total = lines.reduce((n, l) => n + l.n, 0);
  const rows = extra && extra.length > 0 ? [...lines, ...extra] : lines;
  return (
    <div className="space-y-2" data-trophy-case>
      <CelebrationStyles />
      <div className="cm-rise rounded-2xl border border-gold/40 bg-card p-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">
          <Trophy className="mr-1 inline h-4 w-4 text-gold" />
          {rings} {rings === 1 ? ringWord : `${ringWord}s`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {total === 0
            ? rows.length > lines.length
              ? 'No individual honour yet. Every award you win lands here with the year on it.'
              : 'Nothing on the shelf yet. Every award you win lands here with the year on it.'
            : `${total} individual ${total === 1 ? 'honour' : 'honours'} across ${seasons.length} ${seasons.length === 1 ? 'season' : 'seasons'}.`}
        </p>
      </div>

      {rows.length === 0 ? null : (
        <div className="space-y-1.5">
          {rows.map((l, i) => (
            <div
              key={l.label}
              className="cm-tick-in rounded-xl border border-border bg-card px-3 py-2"
              style={{ animationDelay: revealDelay(i, 0.2, 0.1) }}
            >
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
      {intlTile && (
        <button
          type="button"
          data-intl-open
          onClick={intlTile.onOpen}
          className="min-h-[44px] w-full rounded-xl border border-sky-500/40 bg-card px-3 py-2 text-left hover:bg-secondary/60"
        >
          <span className="block text-sm font-bold text-foreground">🌍 International</span>
          <span className="block text-xs text-muted-foreground">{intlTile.sub}</span>
        </button>
      )}
    </div>
  );
}
