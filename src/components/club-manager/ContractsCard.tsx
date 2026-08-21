import { cn } from '@/lib/utils';
import { money, wageBill, wageCapFrom, renewalTerms, renewalTermsWithClause, expiringPlayers, sellValue } from '@/lib/clubManager';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import { ratingTint } from '@/components/club-manager/SquadScreen';

interface ContractsCardProps {
  career: CareerState;
  onRenew: (playerId: string) => void;
  onRenewWithClause: (playerId: string) => void;
}

/**
 * Round 105: the wage bill and everyone whose deal is running out.
 *
 * Keeping a 92 rated superstar used to cost exactly what keeping a 68 rated
 * squad player cost, which is nothing, so there was no reason to ever let
 * anyone go. Now every player is on a wage and a deal, the board has a
 * ceiling, and a player you never sit down with walks out for free in the
 * summer with his sale value already collapsed.
 *
 * Round 193: this card was built in 105 and NEVER MOUNTED, so renewals have
 * been unreachable since the wage engine shipped: deals ticked down and
 * players walked with no way to sit them down. It lives on the Squad tab
 * now. And every renewal is a real negotiation with two shapes: the plain
 * deal at his full ask, or 88 percent of the wage in exchange for a release
 * clause at 1.5x his sell value TODAY, an exit door any club can pay. His
 * value grows, the clause does not, and a plain renewal later is the only
 * way to delete it. The clause section below the expiring list keeps every
 * door you have signed in plain sight.
 */
export function ContractsCard({ career, onRenew, onRenewWithClause }: ContractsCardProps) {
  const bill = wageBill(career);
  const cap = career.wageCap ?? wageCapFrom(bill);
  const pct = Math.round((bill / Math.max(1, cap)) * 100);
  const over = bill > cap;
  const expiring = expiringPlayers(career);
  const claused = career.squad
    .filter(p => !p.onLoan && (p.releaseClause ?? 0) > 0)
    .sort((a, b) => (sellValue(b) / (b.releaseClause as number)) - (sellValue(a) / (a.releaseClause as number)));

  const row = (p: CMPlayer) => {
    const terms = renewalTerms(p);
    const withClause = renewalTermsWithClause(p);
    const affordable = terms.fee <= career.budget;
    const clauseAffordable = withClause.fee <= career.budget;
    return (
      <div key={p.id} className="py-1.5 border-b border-border/30 last:border-0">
        <div className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-foreground truncate">{p.name}</div>
            <div className="text-[9px] text-muted-foreground">
              {p.age}y · on {p.wage ?? 0}k a week · final year{(p.releaseClause ?? 0) > 0 ? ` · clause ${money(p.releaseClause as number)}` : ''}
            </div>
          </div>
          <span className={cn('text-sm font-bold font-display', ratingTint(p.rating))}>{p.rating}</span>
        </div>
        <div className="mt-1 flex gap-1.5 pl-11">
          <button
            onClick={() => onRenew(p.id)}
            disabled={!affordable}
            title={affordable
              ? `${terms.years} more years at ${terms.wage}k a week, ${money(terms.fee)} to sign. No clause; deletes any he carries.`
              : `You cannot afford the ${money(terms.fee)} signing on fee`}
            className={cn('flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all',
              affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
          >
            Renew · {terms.wage}k/w · {money(terms.fee)}
          </button>
          <button
            onClick={() => onRenewWithClause(p.id)}
            disabled={!clauseAffordable}
            title={clauseAffordable
              ? `${withClause.years} years at only ${withClause.wage}k a week, ${money(withClause.fee)} to sign, but a ${money(withClause.clause)} release clause any club can pay. It cannot be rejected or blocked.`
              : `You cannot afford the ${money(withClause.fee)} signing on fee`}
            className={cn('flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border',
              clauseAffordable ? 'border-gold/60 bg-gold/10 text-foreground hover:border-gold' : 'border-border bg-secondary text-muted-foreground cursor-not-allowed')}
          >
            +Clause · {withClause.wage}k/w · exit {money(withClause.clause)}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2" data-contracts-desk>
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
            Let a deal run out and he leaves in the summer for nothing. The clause deal pays him 12 percent
            less, and the price is an exit door at 1.5x his value today that any club can walk through.
          </p>
        </>
      )}

      {claused.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wider font-bold pt-1 text-muted-foreground">
            🔓 Release clauses you have granted ({claused.length})
          </div>
          {claused.map(p => {
            const ratio = sellValue(p) / (p.releaseClause as number);
            const terms = renewalTerms(p);
            const affordable = terms.fee <= career.budget;
            return (
              <div key={p.id} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground truncate">{p.name}</div>
                  <div className={cn('text-[9px]', ratio >= 1 ? 'text-red-400 font-bold' : 'text-muted-foreground')}>
                    clause {money(p.releaseClause as number)} · worth {money(sellValue(p))}{ratio >= 1 ? ' · A BARGAIN, clubs will pay this' : ''}
                  </div>
                </div>
                <button
                  onClick={() => onRenew(p.id)}
                  disabled={!affordable}
                  title={affordable
                    ? `A plain renewal deletes the clause: ${terms.years} years at ${terms.wage}k a week, ${money(terms.fee)} to sign.`
                    : `Deleting the clause means a full renewal, and you cannot afford the ${money(terms.fee)} fee`}
                  className={cn('shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                    affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                >
                  Remove · {money(terms.fee)}
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default ContractsCard;
