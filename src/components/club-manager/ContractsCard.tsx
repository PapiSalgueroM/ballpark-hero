import { cn } from '@/lib/utils';
import { money, wageBill, wageCapFrom, renewalTerms, expiringPlayers } from '@/lib/clubManager';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import { ratingTint } from '@/components/club-manager/SquadScreen';

interface ContractsCardProps {
  career: CareerState;
  onRenew: (playerId: string) => void;
}

/**
 * Round 105: the wage bill and everyone whose deal is running out.
 *
 * Keeping a 92 rated superstar used to cost exactly what keeping a 68 rated
 * squad player cost, which is nothing, so there was no reason to ever let
 * anyone go. Now every player is on a wage and a deal, the board has a
 * ceiling, and a player you never sit down with walks out for free in the
 * summer with his sale value already collapsed.
 */
export function ContractsCard({ career, onRenew }: ContractsCardProps) {
  const bill = wageBill(career);
  const cap = career.wageCap ?? wageCapFrom(bill);
  const pct = Math.round((bill / Math.max(1, cap)) * 100);
  const over = bill > cap;
  const expiring = expiringPlayers(career);

  const row = (p: CMPlayer) => {
    const terms = renewalTerms(p);
    const affordable = terms.fee <= career.budget;
    return (
      <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
        <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-foreground truncate">{p.name}</div>
          <div className="text-[9px] text-muted-foreground">
            {p.age}y · on {p.wage ?? 0}k a week · final year
          </div>
        </div>
        <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
        <button
          onClick={() => onRenew(p.id)}
          disabled={!affordable}
          title={affordable
            ? `${terms.years} more years at ${terms.wage}k a week, ${money(terms.fee)} to sign`
            : `You cannot afford the ${money(terms.fee)} signing on fee`}
          className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all min-w-[76px]',
            affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
        >
          Renew · {money(terms.fee)}
        </button>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">📝 Contracts</div>
        <div className={cn('text-[10px] font-bold', over ? 'text-red-400' : 'text-emerald-400')}>
          {bill}k of {cap}k a week
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', over ? 'bg-red-500' : pct > 88 ? 'bg-yellow-500' : 'bg-emerald-500')}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {over && (
        <p className="text-[10px] text-red-400">
          You are {pct - 100} percent over the wage budget. The board notice every week you stay there.
        </p>
      )}

      {expiring.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Nobody is in the last year of his deal. Nothing needs signing today.</p>
      ) : (
        <>
          <div className="text-[10px] text-gold uppercase tracking-wider font-bold pt-1">
            ⏳ Final year ({expiring.length})
          </div>
          <div className="max-h-64 overflow-y-auto">{expiring.map(row)}</div>
          <p className="text-[9px] text-muted-foreground">
            Let a deal run out and he leaves in the summer for nothing. His fee is already less than half what it
            would be on a long contract, so the longer you wait the less he is worth.
          </p>
        </>
      )}
    </div>
  );
}

export default ContractsCard;
