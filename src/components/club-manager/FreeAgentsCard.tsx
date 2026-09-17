import { useState } from 'react';
import { cn } from '@/lib/utils';
import { moneyIn, freeAgentAsk, freeAgentInterest, wageBill, wageCapFrom, SQUAD_LIMIT } from '@/lib/clubManager';
import type { CareerState, FreeAgent } from '@/lib/clubManager';
import { ratingTint } from '@/components/club-manager/SquadScreen';

interface FreeAgentsCardProps {
  career: CareerState;
  onSign: (name: string, terms: { years: number; wage: number }) => void;
}

/**
 * Round 619: men with no club, and the one door that opens when the window is
 * shut.
 *
 * This sits on the transfer screen ABOVE the market rather than inside it,
 * because the whole point of the feature is that it still works on a week when
 * everything below it is greyed out. A manager who has just lost a centre half
 * in October can do something about it, which is exactly what happens in real
 * football and exactly what this mode could not do before.
 *
 * The list is honest about refusals. A free agent who will not come says so and
 * why, rather than the button quietly doing nothing, because "he thinks he can
 * do better than you" is information a manager can act on and a dead button is
 * not.
 */
export function FreeAgentsCard({ career, onSign }: FreeAgentsCardProps) {
  const money = moneyIn(career);
  const [open, setOpen] = useState(false);
  const pool = career.freeAgents ?? [];
  const full = career.squad.length >= SQUAD_LIMIT;
  const cap = career.wageCap ?? wageCapFrom(wageBill(career));

  if (!pool.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="text-xs font-bold text-foreground">🆓 Free agents</div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Nobody is out of contract right now. Players land here when their deals run out in the
          summer, or when a club settles a contract early.
        </p>
      </div>
    );
  }

  const row = (fa: FreeAgent) => {
    const ask = freeAgentAsk(fa);
    /* Quote him at his own ask: the screen should show the deal he would
       actually take, not an invented one the engine then refuses. */
    const terms = { years: ask.years, wage: ask.wage };
    const interest = freeAgentInterest(career, fa, terms);
    const room = wageBill(career) + ask.wage <= cap * 1.25;
    const canSign = interest.willSign && room && !full;
    const why = full
      ? `Your squad is full at ${SQUAD_LIMIT}.`
      : !room
        ? `${ask.wage}k a week would take the bill too far past the ${cap}k the board agreed.`
        : interest.reason;
    return (
      <div key={fa.name} className="py-1.5 border-b border-border/30 last:border-0">
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{fa.position}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground truncate">{fa.name}</div>
            <div className="text-[9px] text-muted-foreground">
              {fa.age}y · {fa.reason === 'released' ? 'contract settled' : 'deal ran out'}
              {fa.fromMyClub ? ' here' : ''} · wants {ask.wage}k a week for {ask.years} year{ask.years === 1 ? '' : 's'}
            </div>
          </div>
          <span className={cn('text-sm font-bold font-display', ratingTint(fa.rating))}>{fa.rating}</span>
        </div>
        <div className="mt-1 pl-11">
          {canSign ? (
            <button
              onClick={() => onSign(fa.name, terms)}
              className="w-full px-2 py-1.5 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all"
            >
              Sign on a free · {ask.wage}k/w · {ask.years}y
            </button>
          ) : (
            <p className="text-[9px] text-muted-foreground italic">{why}</p>
          )}
        </div>
      </div>
    );
  };

  const willing = pool.filter(fa => freeAgentInterest(career, fa, freeAgentAsk(fa)).willSign).length;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">🆓 Free agents ({pool.length})</span>
        <span className="text-[10px] text-muted-foreground">{open ? '▾' : '▸'}</span>
      </button>
      <p className="text-[10px] text-muted-foreground">
        No club, no fee, and no window. {willing} of {pool.length} would come here.
      </p>
      {open && (
        <div className="max-h-80 overflow-y-auto pt-1">
          {pool.slice().sort((a, b) => b.rating - a.rating).map(row)}
        </div>
      )}
    </div>
  );
}
