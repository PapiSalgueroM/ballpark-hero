import { useRef, useState } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { internationalReturnEligibility, readInternationalReturn } from '@/lib/soccerInternationalReturn';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function InternationalReturnCard({ career, onReturn }: { career: CareerState; onReturn: () => void }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitted = useRef(false);
  const eligibility = internationalReturnEligibility(career);
  const receipt = readInternationalReturn(career);
  const saved = !!receipt && receipt.sourceYear === career.seasons[career.seasons.length - 1]?.year;
  if (career.phase !== 'playing' || career.retired || (!eligibility.available && !saved)) return null;

  const changeOpen = (next: boolean) => {
    if (next) { setHelp(true); submitted.current = false; }
    setOpen(next);
  };
  const confirm = () => {
    if (submitted.current || !eligibility.available || saved) return;
    submitted.current = true;
    setOpen(false);
    onReturn();
  };
  const active = career.internationalCareer && !career.intStats.isRetired;

  return <div data-international-return-status={saved ? 'saved' : 'available'} className="rounded-xl border border-blue-500/30 bg-card p-3 text-sm">
    <p className="font-bold">{saved ? active ? 'Available for national-team selection' : 'International plans already changed this season' : 'Your country again?'}</p>
    <p className="mt-1 text-xs text-muted-foreground">{saved ? 'Your choice is saved. Squad selection still decides who plays.' : 'Make yourself available again and earn your next squad place.'}</p>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button ref={trigger} data-international-return-open variant="outline" className="mt-3 min-h-11 w-full whitespace-normal">{saved ? 'International comeback help' : 'National-team comeback'}</Button>
      </DialogTrigger>
      <DialogContent data-international-return-dialog className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-md flex-col gap-3 overflow-hidden rounded-xl p-4 [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:opacity-100"
        onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogTitle ref={heading} data-international-return-title tabIndex={-1} className="shrink-0 pr-12 text-base">{saved ? 'Your international plans' : 'Make yourself available again'}</DialogTitle>
        <DialogDescription className="shrink-0">National-team selection for {career.nationality}.</DialogDescription>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-xs leading-relaxed">
          {help ? <div data-international-return-help className="space-y-3">
            <p>Returning opens national-team selection again. It does not give you a call-up or play a match.</p>
            <p>Your existing caps, goals, trophies and tournament history stay on the books. The actual squad selector decides your next appearances.</p>
            <p>Form, rating and age still matter. Injury, bans and failed qualification can still keep you out.</p>
            <p>You can return once per recorded season. Retiring again, moving clubs or reloading cannot unlock another return that season.</p>
            <p>Example: return with 40 caps. You still have 40 until you actually play for your country again.</p>
          </div> : <div data-international-return-review className="space-y-3">
            <p className="font-bold">{saved ? 'Your availability choice is saved.' : 'This restores your availability.'}</p>
            <p>No instant caps, extra money or rating boost. Play your next season when you are ready.</p>
            <p>{saved ? 'You cannot make another return in this recorded season, even if you retire from internationals again.' : 'You can still retire from international football again, but another return has to wait for a later recorded season.'}</p>
          </div>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button data-international-return-cancel variant="outline" className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={() => changeOpen(false)}>Back</Button>
          <Button data-international-return-help-open variant="outline" className="h-11 w-11 shrink-0 p-0" aria-label="International comeback help" aria-expanded={help} onClick={() => setHelp(!help)}>?</Button>
          {!saved && (help ? <Button data-international-return-review-open className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={() => setHelp(false)}>Review comeback</Button>
            : <Button data-international-return-confirm className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={confirm}>Make me available</Button>)}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
