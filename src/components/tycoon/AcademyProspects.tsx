import { cn } from '@/lib/utils';
import { FIRST_TEAM_SLOTS, PROMOTE_AGE, fmtCash, potentialRead, salePrice } from '@/lib/wonderkidFactory';
import type { FactoryState } from '@/lib/wonderkidFactory';

export default function AcademyProspects({ s, doSell, doPromote }: {
  s: FactoryState;
  doSell: (id: number) => void;
  doPromote: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {s.prospects.map(p => {
        const read = potentialRead(s, p);
        const price = salePrice(s, p);
        const pct = Math.min(100, ((p.rating - 40) / 59) * 100);
        const nearCeiling = p.rating >= p.potential - 0.5;
        return (
          <div key={p.id} className={cn('rounded-xl border p-2.5', nearCeiling ? 'border-gold/50 bg-gold/5' : 'border-border bg-background/40')}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.pos} · {p.nation} · age {p.age}{p.age >= 21 ? ' · promise fading' : ''}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black font-display text-foreground tabular-nums">{Math.floor(p.rating)}</div>
                <div className="text-[9px] text-muted-foreground">
                  {read.kind === 'exact' ? `ceiling ${read.lo}` : read.kind === 'range' ? `ceiling ${read.lo} to ${read.hi}` : 'ceiling unknown'}
                </div>
              </div>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', nearCeiling ? 'bg-gold' : 'bg-primary')} style={{ width: `${pct}%` }} />
            </div>
            <button
              onClick={() => doSell(p.id)}
              className="mt-2 w-full rounded-lg bg-primary text-primary-foreground text-xs font-bold py-2 hover:opacity-90 transition-opacity"
            >
              Sell for {fmtCash(price)}
            </button>
            <button
              type="button"
              onClick={() => doPromote(p.id)}
              disabled={p.age < PROMOTE_AGE || (s.firstTeam?.length ?? 0) >= FIRST_TEAM_SLOTS}
              className="mt-1.5 min-h-[40px] w-full rounded-lg border border-border px-2 py-2 text-xs font-bold text-foreground hover:border-primary disabled:cursor-default disabled:opacity-50"
            >
              {p.age < PROMOTE_AGE ? `First team at ${PROMOTE_AGE}` : (s.firstTeam?.length ?? 0) >= FIRST_TEAM_SLOTS ? 'First team full' : 'Promote to first team'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
