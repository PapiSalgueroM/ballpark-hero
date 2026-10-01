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
              <span className="w-[72px] shrink-0 text-[9px] uppercase tracking-wider text-muted-foreground truncate">{k.side === 'me' ? clubName : opponent}</span>
              <span className="flex-1 min-w-0 truncate text-foreground">
                {k.taker}
                {k.gen && <MadeUpTag className="ml-1" />}
              </span>
              <span className={cn('shrink-0 font-semibold', k.result === 'scored' ? 'text-correct' : 'text-destructive')}>
                <span aria-hidden="true">{r.icon}</span> {r.word}
              </span>
              <span className="w-8 shrink-0 text-right font-bold tabular-nums text-foreground">{k.mine}-{k.theirs}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
