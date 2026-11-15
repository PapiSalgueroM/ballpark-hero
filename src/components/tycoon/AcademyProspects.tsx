import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { FIRST_TEAM_SLOTS, LEAVE_AGE, PROMOTE_AGE, YEAR_SEC, fmtCash, potentialRead, salePrice } from '@/lib/wonderkidFactory';
import type { FactoryState } from '@/lib/wonderkidFactory';

export default function AcademyProspects({ s, doSell, doPromote }: {
  s: FactoryState;
  doSell: (id: number, minimumPrice: number) => 'price-changed' | void;
  doPromote: (id: number) => void;
}) {
  const pressedSale = useRef<{ id: number; pointerId: number; price: number } | null>(null);
  const [lowerQuoteId, setLowerQuoteId] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {s.prospects.map(p => {
        const read = potentialRead(s, p);
        const price = salePrice(s, p);
        const pct = Math.min(100, ((p.rating - 40) / 59) * 100);
        const nearCeiling = p.rating >= p.potential - 0.5;
        const leavesIn = p.age === LEAVE_AGE - 1 ? YEAR_SEC - p.ageClock : null;
        return (
          <div key={p.id} className={cn('rounded-xl border p-2.5', nearCeiling ? 'border-gold/50 bg-gold/5' : 'border-border bg-background/40')}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.pos} · {p.nation} · age {p.age}{p.age >= 21 && leavesIn === null ? ' · promise fading' : ''}</div>
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
            {leavesIn !== null && (
              <p className="mt-1.5 text-[11px] leading-4 tabular-nums text-muted-foreground">
                Leaves in {Math.ceil(leavesIn)}s of play · {s.deadlineLeft > 0 ? 'Deadline bonus active'
                  : s.deadlineIn < leavesIn ? `Deadline first (${Math.ceil(s.deadlineIn)}s)` : 'Deadline too late'}
              </p>
            )}
            <button
              type="button"
              onPointerDown={(event) => {
                if (event.button === 0) pressedSale.current = { id: p.id, pointerId: event.pointerId, price };
              }}
              onPointerCancel={(event) => {
                if (pressedSale.current?.pointerId === event.pointerId) pressedSale.current = null;
              }}
              onClick={(event) => {
                const press = pressedSale.current;
                pressedSale.current = null;
                const minimumPrice = event.detail > 0 && press?.id === p.id ? press.price : price;
                setLowerQuoteId(doSell(p.id, minimumPrice) === 'price-changed' ? p.id : null);
              }}
              className="mt-2 w-full rounded-lg bg-primary text-primary-foreground text-xs font-bold py-2 hover:opacity-90 transition-opacity"
            >
              Sell for {fmtCash(price)}
            </button>
            {lowerQuoteId === p.id && <p role="status" className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
              The sale price fell to {fmtCash(price)}. Choose Sell again to accept.
            </p>}
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
