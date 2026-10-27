import { useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, HelpCircle } from 'lucide-react';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { cn } from '@/lib/utils';
import { isPartialClub, loanOutRefusal, moneyIn } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { loanDevelopmentOf } from '@/lib/clubManagerLoanDevelopment';
import {
  loanPlanHistoryOf, loanPlanHosts, loanPlanPreview, loanPlanUnavailableReason,
} from '@/lib/clubManagerLoanPlan';
import type { LoanPlanPreview, LoanPlanRequest } from '@/lib/clubManagerLoanPlan';

interface LoanPlanCardProps {
  career: CareerState;
  onAgree: (request: LoanPlanRequest) => boolean;
  onReview: (playerId: string) => boolean;
  onRecall: (playerId: string, recordId: string) => boolean;
}
const ROLE = { leading: 'Leading on ratings', competing: 'Competing for a place', depth: 'Behind other options' };

export function LoanPlanCard({ career, onAgree, onReview, onRecall }: LoanPlanCardProps) {
  const [open, setOpen] = useState(false), [rules, setRules] = useState(true);
  const [playerId, setPlayerId] = useState(''), [host, setHost] = useState('');
  const [preview, setPreview] = useState<LoanPlanPreview | null>(null), [notice, setNotice] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const money = moneyIn(career), player = career.squad.find(p => p.id === playerId);
  const bid = career.incomingBids?.find(b => b.playerId === playerId && b.loan);
  const hosts = loanPlanHosts(career), history = loanPlanHistoryOf(career);
  const plans = (career.loanedOut ?? []).filter(l => l.development !== undefined);
  const reveal = useRevealScroll<HTMLDivElement>([open, preview?.token ?? '', notice].join('|'),
    { enabled: open, skipFirst: false, block: 'end' });
  const button = 'min-h-[44px] min-w-[44px] rounded-lg border px-3 text-xs font-semibold disabled:opacity-50';
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  const reset = () => { setPreview(null); setNotice(''); };
  const showPreview = (source: LoanPlanRequest['source'], club = host) => {
    const next = loanPlanPreview(career, playerId, club, source);
    setHost(club); setPreview(next);
    setNotice(next ? '' : loanPlanUnavailableReason(career, playerId, club));
  };
  return <>
    <button ref={trigger} type="button" aria-expanded={open} onClick={() => setOpen(!open)}
      data-cm-tile-btn="loan-plan" className={cn('w-full flex items-center justify-between gap-2 rounded-xl border bg-card px-3 min-h-[44px] text-left text-xs', open && 'rounded-b-none border-primary')}>
      <span>Loan plan <span className="font-bold">{plans.length ? '(' + plans.length + ')' : ''}</span></span>
      <ChevronDown className={cn('w-4 h-4 shrink-0', open && 'rotate-180')} />
    </button>
    {open && <section data-testid="loan-plan-body" aria-label="Loan plans" className="rounded-b-xl border border-t-0 border-primary bg-card p-3 space-y-3 text-xs"
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(); } }}>
      <div className="flex justify-between gap-2">
        <button type="button" aria-label="Back from loan plan" onClick={close} className={button}><ArrowLeft className="inline w-4 h-4 mr-1" />Back</button>
        <button type="button" aria-label="Loan plan rules" aria-expanded={rules} onClick={() => setRules(!rules)} className={button}><HelpCircle className="w-4 h-4" /></button>
      </div>
      <p className="text-muted-foreground">Check a host, save the actual terms and review your player before deciding whether to recall him.</p>
      {rules && <p data-testid="loan-plan-rules" className="rounded-lg bg-muted p-3 leading-relaxed">
        Opportunity compares named players at the same recorded primary position. It is an estimate, not promised starts or minutes, and does not add a growth bonus.
        For example, two higher-rated players at his position means competition for a place, even if the fee looks good.
        Standard terms use the normal loan fee; a current offer keeps its actual price. Confirm sends the player out and banks that fee.
        Reviews save his actual rating change, not invented host stats. A recall still needs an open window, its agreed fee and squad room. One loan out per player per season.
      </p>}
      <label className="block">Player
        <select aria-label="Loan plan player" value={playerId} onChange={event => { setPlayerId(event.target.value); reset(); }}
          className="mt-1 min-h-[44px] w-full rounded-lg border bg-background px-2">
          <option value="">Choose a player</option>
          {career.squad.filter(p => !p.onLoan).map(p => <option key={p.id} value={p.id}>{p.name} ({p.position}, {p.rating})</option>)}
        </select>
      </label>
      {player && <p className="text-muted-foreground">{loanOutRefusal(career, player.id) ?? 'Available for a loan under the normal squad rules.'}</p>}
      <label className="block">Host
        <select aria-label="Loan plan host" value={host} onChange={event => { setHost(event.target.value); reset(); }}
          className="mt-1 min-h-[44px] w-full rounded-lg border bg-background px-2">
          <option value="">Choose a host</option>
          {hosts.map(club => <option key={club} value={club}>{club}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={!player || !host} onClick={() => showPreview('standard')}>Preview terms</button>
        {bid && <button type="button" className={button} onClick={() => showPreview('bid', bid.club)}>Use current loan offer</button>}
      </div>
      <div ref={reveal} className="space-y-3">
        {preview && <div data-testid="loan-plan-preview" data-player={preview.playerId} data-host={preview.hostClub} data-source={preview.source} data-token={preview.token} className="rounded-lg border border-primary/40 p-3 space-y-2">
          <p className="font-semibold">{preview.source === 'bid' ? 'Current offer' : 'Standard terms'}: {preview.hostClub}</p>
          <p>Loan fee {money(preview.quote.offer.fee)}.
            {preview.quote.offer.recallFee !== undefined && <> Recall {money(preview.quote.offer.recallFee)}.</>}
            {preview.quote.offer.optionFee !== undefined && <> Purchase option {money(preview.quote.offer.optionFee)}.</>}
          </p>
          <p>Projected opportunity: {ROLE[preview.quote.opportunity.estimatedRole]}.
            {' '}{preview.quote.opportunity.higherRated} higher-rated and {preview.quote.opportunity.equallyRated} equally-rated players
            among {preview.quote.opportunity.observedPlayers} named players at this primary position.</p>
          <button type="button" className={cn(button, 'border-primary')} disabled={career.transferWindow === null}
            onClick={() => {
              const ok = onAgree(preview);
              setNotice(ok ? 'Loan plan saved. The player is now out on loan.' : 'That loan plan changed or could not be saved. Refresh the terms and try again.');
              if (ok) { setPreview(null); setPlayerId(''); setHost(''); }
            }}>Confirm loan plan</button>
        </div>}
        {notice && <p role="status" data-cm-partial={host && isPartialClub(host, career.eraId) ? 'CM_PARTIAL' : undefined} className="rounded-lg bg-muted p-2">{notice}</p>}
      </div>
      {plans.length > 0 && <div data-testid="loan-plan-active" className="space-y-2">
        <h3 className="font-semibold">Active plans</h3>
        {plans.map(loan => {
          const record = loanDevelopmentOf(loan.development);
          if (!record) return <p key={loan.player.id}>The saved plan for {loan.player.name} is unavailable. Its loan terms remain on the transfer desk.</p>;
          const current = record.review?.opportunity ?? record.opportunity;
          const canRecall = career.transferWindow !== null && loan.recallFee !== undefined
            && loan.recallFee <= career.budget && career.squad.length < 30;
          return <div key={record.id} className="rounded-lg border p-3 space-y-2">
            <p className="font-semibold">{loan.player.name} at {loan.club}</p>
            <p>Agreed fee {money(record.fee)}. Rating change {record.review ? (record.review.ratingChange > 0 ? '+' : '') + record.review.ratingChange : 'not reviewed yet'}.</p>
            <p>{current.partial === false
              ? 'Projected opportunity: ' + ROLE[current.estimatedRole] + '. ' + current.higherRated + ' higher-rated players at this primary position.'
              : 'Current roster coverage is thin, so no opportunity estimate is available.'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} onClick={() => setNotice(onReview(loan.player.id) ? 'Loan review saved.' : 'That review could not be saved. Reopen the active manager and try again.')}>Review loan plan</button>
              <button type="button" className={button} disabled={!canRecall}
                onClick={() => setNotice(onRecall(loan.player.id, record.id) ? 'Player recalled and loan plan closed.' : 'That recall could not be saved. Check the window, fee and active manager.')}>Recall planned player</button>
            </div>
          </div>;
        })}
      </div>}
      {history === null ? <p>Saved loan-plan history is unavailable.</p> : history.length > 0 && <div data-testid="loan-plan-history" className="space-y-1">
        <h3 className="font-semibold">Recent plans</h3>
        {[...history].reverse().map(row => <p key={row.id}>
          {row.playerName} at {row.hostClub}: {row.kind}. Rating {row.ratingAtStart} to {row.ratingAtEnd}
          {' '}({row.ratingStage === 'annual' ? 'after annual development' : row.ratingStage === 'return' ? 'at loan return' : 'at close'}).
        </p>)}
      </div>}
    </section>}
  </>;
}
