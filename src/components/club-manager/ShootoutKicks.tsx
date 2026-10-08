import { cn } from '@/lib/utils';
import type { ShootoutDetail } from '@/lib/clubManager';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';

/**
 * Round 782: the shootout kick by kick, the same list on the live screen at
 * the whistle and on the full time card. One row a kick in the order they
 * were taken, who stepped up, what happened, and the count as it stood, in
 * my orientation. Only drawn when the report carries the kicks, which is
 * only when the manager had set a shootout order.
 */
const RESULT: Record<'scored' | 'saved' | 'missed', { icon: string; word: string }> = {
  scored: { icon: '⚽', word: 'scored' },
  saved: { icon: '🧤', word: 'saved' },
  missed: { icon: '❌', word: 'missed' },
};

/* Release AM: the men the engine adds to make a thin side up to eleven
   ("Their taker 3", "Their keeper") are made up for a different reason than a
   made up player on a roster, so their tag says the true one. Any other made
   up man keeps the tag's own wording. */
const FILL_IN = /^Their (?:taker \d+|keeper)$/;
const MADE_UP_TAKER = 'Not a real player. We hold fewer than eleven real names for this club, so this game made up the rest of its eleven for the shootout.';

export function ShootoutKicks({ shootout, clubName, opponent, className }: { shootout: ShootoutDetail; clubName: string; opponent: string; className?: string }) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-3 text-left', className)} data-cm-shootout={`${shootout.mine}-${shootout.theirs}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Penalties, kick by kick</span>
        <span className="text-xs font-bold font-display text-foreground tabular-nums">{shootout.mine}-{shootout.theirs}</span>
      </div>
      <ol className="space-y-0.5">
        {shootout.kicks.map((k, i) => {
          const r = RESULT[k.result];
          return (
            <li
              key={i}
              data-cm-pen-kick={i + 1}
              data-cm-pen-side={k.side}
              data-cm-pen-result={k.result}
              className={cn(
                'flex items-center gap-2 rounded-md px-1.5 py-1 text-[11px]',
                k.side === 'me' ? 'bg-primary/10' : 'bg-secondary/40',
              )}
            >
              <span className="w-4 shrink-0 text-right text-[9px] text-muted-foreground tabular-nums">{i + 1}</span>
              {/* Release AM: on a phone the club sits on its own small line above
                  the taker, so the name gets the whole width and a made up
                  taker's number and tag are never cut off. From sm up it is the
                  one line it always was. The tag sits beside the name, outside
                  the part that can shorten, so only a very long name ever does. */}
              <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="truncate text-[9px] uppercase tracking-wider text-muted-foreground sm:w-[72px] sm:shrink-0">{k.side === 'me' ? clubName : opponent}</span>
                <span className="flex min-w-0 items-center gap-1 sm:flex-1">
                  <span data-cm-pen-taker className="truncate text-foreground">{k.taker}</span>
                  {k.gen && <MadeUpTag title={FILL_IN.test(k.taker) ? MADE_UP_TAKER : undefined} />}
                </span>
              </span>
              <span className={cn('shrink-0 font-semibold', k.result === 'scored' ? 'text-correct' : 'text-destructive')}>
                <span aria-hidden="true">{r.icon}</span> {r.word}
              </span>
              <span className="w-10 shrink-0 whitespace-nowrap text-right font-bold tabular-nums text-foreground">{k.mine}-{k.theirs}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
