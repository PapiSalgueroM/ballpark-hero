import { useEffect, useRef } from 'react';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import { quoteManagerJob, readManagerJobReview, type ManagerJobChoice, type ManagerJobQuote } from '@/lib/soccerCareerManagerJobReview';
import { useRevealScroll } from '@/hooks/useRevealScroll';

export default function SoccerManagerJobReview({ career, clubs, help, onBack, onResolve }: {
  career: CareerState; clubs: ClubData[]; help: boolean; onBack: () => void;
  onResolve?: (quote: ManagerJobQuote, choice: ManagerJobChoice) => void;
}) {
  const pending = readManagerJobReview(career, clubs)?.pending, quote = quoteManagerJob(career, clubs);
  const root = useRevealScroll(pending ? 'manager-job-review-pending' : 'manager-job-review-help', { skipFirst: false });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [pending?.season, help]);
  return <div ref={root} className="rounded-xl border border-emerald-500/40 bg-card p-3 space-y-3">
    <h4 ref={heading} tabIndex={-1} className="font-bold text-sm">Review job moves</h4>
    {pending && <div className="space-y-3">
      <p className="text-xs">Your season at {pending.from.club} is finished. {pending.to.club} has made an approach for next season.</p>
      <p className="text-xs text-muted-foreground">The season, cup run and income are settled. Any national-team call is already settled too. Accept joins this club. Stay keeps your current job. This choice does not reroll the offer.</p>
      <div className="grid grid-cols-1 min-[390px]:grid-cols-2 gap-2">
        <button className="min-h-11 rounded-lg border border-primary p-2 text-sm font-bold" disabled={!quote || !onResolve} onClick={() => quote && onResolve?.(quote, 'accept')}>Accept move</button>
        <button className="min-h-11 rounded-lg border border-border p-2 text-sm font-bold" disabled={!quote || !onResolve} onClick={() => quote && onResolve?.(quote, 'stay')}>Stay at {pending.from.club}</button>
      </div>
      <p className="text-xs text-muted-foreground">Choose before starting another manager season.</p>
    </div>}
    {help && <div className="space-y-2 text-xs text-muted-foreground">
      <p>Turn on Review job moves to choose when an earned approach would move you to another club. The usual season simulation still decides whether a move is earned.</p>
      <p>Example: a fourth-place season earns an approach. Accept moves you to that club for next season. Stay lets you continue at your current club. The season result stays the same whichever option you pick.</p>
      <p>Leave the setting off to keep automatic job moves. It cannot be changed while a decision is pending.</p>
      <button onClick={onBack} className="min-h-11 w-full rounded-lg border border-border p-2 font-bold text-foreground">Back</button>
    </div>}
  </div>;
}
