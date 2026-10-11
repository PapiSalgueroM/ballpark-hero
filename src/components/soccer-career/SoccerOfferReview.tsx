import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatNumber } from '@/lib/formatNumber';
import type { SoccerOfferReviewData } from '@/lib/soccerOfferReview';
import { localizeMoney as money, rateNote } from '@/lib/soccerCurrency';

export function SoccerOfferReview({ club, review, onAccept }: {
  club: string; review: SoccerOfferReviewData; onAccept: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const signing = useRef(false);
  /* Release AL: in euros the figure passes through as typed, so it is grouped
     here like every other number since Round 1085 (€340,696/wk, not
     €340696/wk). A converted figure is already shortened to k or M by
     localizeMoney and is left as it comes back. */
  const wage = (value: number) => {
    const typed = `€${value}/wk`;
    const shown = money(typed);
    return shown === typed ? `€${formatNumber(value)}/wk` : shown;
  };
  const currencyNote = rateNote();
  const changeOpen = (next: boolean) => {
    if (next) { signing.current = false; setHelp(false); }
    setOpen(next);
  };
  const sign = () => {
    if (signing.current) return;
    signing.current = true;
    setOpen(false);
    onAccept();
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button ref={trigger} aria-label={`Review contract with ${club}`} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">
          Review contract
        </Button>
      </DialogTrigger>
      <DialogContent data-soccer-offer-review className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-md flex-col gap-3 rounded-xl p-4 [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:opacity-100"
        onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogTitle ref={heading} tabIndex={-1} className="pr-12 text-base">Review contract</DialogTitle>
        <DialogDescription data-offer-club className="text-sm font-semibold text-foreground break-words">{club}</DialogDescription>
        <div className="min-h-0 overflow-y-auto space-y-3 text-xs leading-relaxed">
          {help ? (
            <div data-offer-review-help className="space-y-3">
              <p>The signed wage includes your agent's negotiating effect. This is contract pay, before separate income fees and spending.</p>
              <p>{money('Example: a €1000 base offer with a 10% increase signs at €1100 a week. Against a €1000 current wage, that is €100 more each week.')}</p>
              <p>Squad fit compares your rating with the recorded squad for that season. It does not decide your starts. Missing squad data stays unavailable.</p>
              <p>Back leaves the offer untouched. Only Sign contract accepts this deal.</p>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                <div data-offer-current>
                  <dt className="text-muted-foreground">Current deal</dt>
                  {review.current ? <dd className="mt-1 space-y-1">
                    <span className="block break-words">{review.current.club}</span>
                    <strong data-offer-current-wage={review.current.wage} className="block">{wage(review.current.wage)}</strong>
                    <span className="block">{review.current.years}yr left</span>
                  </dd> : <dd className="mt-1">{review.currentReason}</dd>}
                </div>
                <div>
                  <dt className="text-muted-foreground">This offer</dt>
                  <dd className="mt-1 space-y-1">
                    <strong data-offer-signed-wage={review.signedWage} className="block text-sm">{wage(review.signedWage)}</strong>
                    <span data-offer-contract-years={review.years} className="block">{review.years}-year contract</span>
                    <span className="block text-muted-foreground">Agent effect included</span>
                  </dd>
                </div>
              </dl>
              {review.wageDelta !== null && <p data-offer-wage-delta={review.wageDelta} className="font-semibold">
                {review.wageDelta === 0 ? 'Same weekly wage as your current deal.' : `${wage(Math.abs(review.wageDelta))} ${review.wageDelta > 0 ? 'more' : 'less'} than your current deal.`}
              </p>}
              <div data-offer-depth={review.depth ? 'available' : 'unavailable'} className="rounded-lg bg-muted/40 p-3">
                {review.depth ? <>
                  <p className="font-semibold">Recorded {review.season}/{String(review.season + 1).slice(-2)} squad fit</p>
                  <p>Position rank: {review.depth.rank} of {review.depth.total} {review.depth.group}.</p>
                  <p className="text-muted-foreground">A rating comparison, not a promise of starts.</p>
                </> : <p>Squad data unavailable for this club and season.</p>}
              </div>
            </>
          )}
          {currencyNote && <p className="text-muted-foreground">{currencyNote}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="h-11 flex-1 px-3 text-xs" onClick={() => help ? setHelp(false) : changeOpen(false)}>{help ? 'Back to review' : 'Back'}</Button>
          <Button variant="outline" className="h-11 w-11 shrink-0 p-0" aria-label={help ? 'Close contract review help' : 'Contract review help'} aria-expanded={help} onClick={() => setHelp(value => !value)}>?</Button>
          {!help && <Button className="h-11 flex-1 px-3 text-xs" onClick={sign}>Sign contract</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
