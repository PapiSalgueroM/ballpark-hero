import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { money, renewalTerms, type CareerState, type CMPlayer } from '@/lib/clubManager';
import { cn } from '@/lib/utils';

/* Round 1597, the owner: "if u dont resign a player in time then they just dissapear from the game". The season
   review asks about every deal that runs out before the summer can start, the way the four front office games
   refuse to run an offseason with an undecided expiring man. Renew uses the contracts desk's own renewal (the
   same terms the desk quotes); "Let him go" is the screen's own answer and changes nothing on the save, so a
   reload simply asks again. A man let go walks at the summer exactly as before, onto the free agent list. */

export type DealAnswer = 'renewed' | 'letGo' | 'open';

/** Where each man the review opened with stands now. Pure: renewed is read off the save (his deal is no
 *  longer in its final year), let go off the screen's own set. A man in the squad or out on loan from me is still
 *  mine (expiringDeals lists both, and loanClub says where he is playing); anyone else is answered. */
export function dealAnswers(c: Pick<CareerState, 'squad' | 'loanedOut'>, ids: readonly string[], letGo: ReadonlySet<string>): { id: string; man: CMPlayer | undefined; loanClub?: string; answer: DealAnswer }[] {
  return ids.map(id => {
    const lent = (c.loanedOut ?? []).find(l => l.player.id === id);
    const man = c.squad.find(p => p.id === id) ?? lent?.player;
    const answer: DealAnswer = !man || (man.contractYears ?? 9) > 1 ? 'renewed' : letGo.has(id) ? 'letGo' : 'open';
    return { id, man, ...(lent && man === lent.player ? { loanClub: lent.club } : {}), answer };
  });
}

/** The worked example's numbers, off the engine's own renewal for a made up 24 year old right winger. */
function exampleTerms() {
  return renewalTerms({ id: 'example', name: 'Example', position: 'RW', rating: 74, age: 24, value: 12, fitness: 100, morale: 70,
    injuryWeeks: 0, suspendedMatches: 0, isYouth: false, seasonGoals: 0, seasonAssists: 0 } as CMPlayer);
}

export function ExpiringDealsCheckpoint({ c, ids, letGo, onRenew, onLetGo, onLetRestGo }: {
  c: CareerState;
  ids: readonly string[];
  letGo: ReadonlySet<string>;
  onRenew: (playerId: string) => void;
  onLetGo: (playerId: string) => void;
  onLetRestGo: () => void;
}) {
  const [help, setHelp] = useState(false);
  if (!ids.length) return null;
  const rows = dealAnswers(c, ids, letGo);
  const open = rows.filter(r => r.answer === 'open').length;
  const ex = exampleTerms();
  return (
    <div data-cm-deals className="text-left bg-surface-2 border border-primary/40 rounded-xl p-3 mt-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">📝 Deals ending this summer</div>
        <button
          data-cm-deals-help
          onClick={() => setHelp(h => !h)}
          aria-expanded={help}
          aria-label="How the contracts checkpoint works"
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
      {help && (
        <div data-cm-deals-rules className="text-[11px] text-foreground bg-card border border-border rounded-lg p-2.5 mb-2 space-y-1.5">
          <p>Every man below is in the last year of his deal. Answer each one before the summer starts: renew him on the contracts desk&apos;s terms, or let him go. A man you lent out is here too: renew him and the new deal is waiting when he comes home.</p>
          <p>Let him go and he leaves for nothing when the summer starts. He goes onto the free agent list and stays there, a year older each summer, until a club signs him or he retires.</p>
          <p className="text-muted-foreground">Say your right winger, 24, has a year left. Renew him here and he signs for {ex.years} years at {ex.wage}k a week, with a {money(ex.fee)} signing on fee out of your budget. Let him go and the wage is off your books from the summer.</p>
        </div>
      )}
      <div className="space-y-1.5">
        {rows.map(({ id, man, loanClub, answer }) => {
          if (!man) return null;
          const terms = renewalTerms(man);
          const affordable = terms.fee <= c.budget;
          return (
            <div key={id} data-cm-deal={answer} {...(loanClub ? { 'data-cm-deal-loan': loanClub } : {})} className="flex items-center gap-2 min-h-11">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground truncate" title={man.name}>{man.name}</div>
                <div className="text-[9px] text-muted-foreground">
                  {man.position}, {man.age}, {man.rating} rated{loanClub ? `, on loan at ${loanClub}` : ''} · {answer === 'renewed' ? `renewed, ${man.contractYears} years`
                    : answer === 'letGo' ? 'leaving for nothing this summer'
                    : `renew: ${terms.years}y at ${terms.wage}k a week, ${money(terms.fee)} to sign`}
                </div>
              </div>
              {answer === 'renewed' ? (
                <span className="shrink-0 min-h-11 inline-flex items-center px-2.5 text-[10px] font-bold text-primary">Renewed</span>
              ) : (
                <>
                  <button
                    data-cm-deal-renew
                    onClick={() => onRenew(id)}
                    disabled={!affordable}
                    title={affordable ? undefined : `You can't afford the ${money(terms.fee)} signing on fee`}
                    className={cn('shrink-0 min-h-11 px-2.5 rounded-lg text-[10px] font-bold transition-all',
                      affordable ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                  >
                    Renew
                  </button>
                  <button
                    data-cm-deal-letgo
                    onClick={() => onLetGo(id)}
                    disabled={answer === 'letGo'}
                    className={cn('shrink-0 min-h-11 px-2.5 rounded-lg text-[10px] font-bold border transition-all',
                      answer === 'letGo' ? 'border-border text-muted-foreground' : 'border-border text-foreground hover:bg-primary/10')}
                  >
                    {answer === 'letGo' ? 'Let go' : 'Let him go'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2">
        <p data-cm-deals-open className="text-[10px] text-muted-foreground">
          {open > 0 ? `${open} still to answer before the summer.` : 'Every deal has an answer.'}
        </p>
        <button
          data-cm-deals-rest
          onClick={onLetRestGo}
          disabled={open === 0}
          className="shrink-0 min-h-11 px-2.5 rounded-lg text-[10px] font-bold border border-border text-foreground hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Let the rest go
        </button>
      </div>
    </div>
  );
}
