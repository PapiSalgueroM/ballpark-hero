import { useRef, useState } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { farewellEligibility, farewellSeasonComplete, readSoccerFarewell } from '@/lib/soccerCareerFarewell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const seasonLabel = (year: number) => `${year}/${String(year + 1).slice(-2)}`;

export function FarewellSeasonCard({ career, onAnnounce }: { career: CareerState; onAnnounce: () => void }) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitted = useRef(false);
  const plan = readSoccerFarewell(career);
  const eligibility = farewellEligibility(career);
  const year = plan?.year ?? eligibility.year;
  const complete = farewellSeasonComplete(career);
  const sourcePhase = plan?.sourcePhase ?? career.phase;
  if (career.retired || year === null || (!plan && !eligibility.eligible)) return null;

  const changeOpen = (next: boolean) => {
    if (next) { setHelp(true); submitted.current = false; }
    setOpen(next);
  };
  const announce = () => {
    if (submitted.current || !eligibility.eligible || plan) return;
    submitted.current = true;
    setOpen(false);
    onAnnounce();
  };

  return <div data-farewell-plan={plan ? 'announced' : 'available'} className="rounded-xl border border-amber-500/30 bg-card p-3 text-sm">
    <p className="font-bold">{plan ? `Your final season: ${seasonLabel(year)}` : 'One last season?'}</p>
    <p className="mt-1 text-xs text-muted-foreground">{plan ? 'Your announcement is saved. Results and queued ceremonies come before retirement.' : 'Choose your final year before hanging up your boots.'}</p>
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button ref={trigger} data-farewell-open variant="outline" className="mt-3 min-h-11 w-full whitespace-normal">{plan ? 'Farewell season help' : 'Plan a farewell season'}</Button>
      </DialogTrigger>
      <DialogContent data-farewell-dialog className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-md flex-col gap-3 overflow-hidden rounded-xl p-4 [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:opacity-100"
        onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogTitle ref={heading} data-farewell-title tabIndex={-1} className="shrink-0 pr-12 text-base">{plan ? 'Your farewell season' : 'Announce your last season'}</DialogTitle>
        <DialogDescription className="shrink-0">{seasonLabel(year)} is {plan ? 'your announced' : 'the proposed'} final year.</DialogDescription>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto text-xs leading-relaxed">
          {help ? <div data-farewell-help className="space-y-3">
            <p>Announcing a farewell commits you to one final year. There is no undo button for the announcement.</p>
            <p>{complete ? 'Your final year is saved. Finish its results and queued ceremonies, then retire.' : plan ? 'Your announcement is saved. Finish the declared year to reach retirement.' : sourcePhase === 'retirement_suggestion' ? 'This year has already started. Confirming resumes that same year, without ageing you again.' : 'Announcing does not play a match. Use Next Season or Watch week by week when you are ready.'}</p>
            <p>You see the actual season results and any queued award, international or rivalry ceremonies, then retire before another transfer window or year.</p>
            <p>Injuries, bans and the existing forced retirement rules still apply. A farewell does not guarantee appearances, fitness or silverware.</p>
            <p>Example: announce {seasonLabel(year)}. Even if you have a great year, your career ends after its results and queued ceremonies.</p>
          </div> : <div data-farewell-review className="space-y-3">
            <p className="font-bold">Last season: {seasonLabel(year)}</p>
            <p>{complete ? 'The saved results and queued ceremonies come before retirement.' : plan ? 'Your announcement is already saved. This help does not play or extend the year.' : sourcePhase === 'retirement_suggestion' ? 'Confirming announces your farewell and plays the pending year now.' : 'Confirming saves your announcement. You still choose when to play the year.'}</p>
            <p>{complete ? 'The final year is complete. You cannot extend this farewell into another playing year.' : 'You can still retire immediately using Retire. You cannot extend this farewell into another playing year.'}</p>
          </div>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button data-farewell-cancel variant="outline" className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={() => changeOpen(false)}>Back</Button>
          <Button data-farewell-help-open variant="outline" className="h-11 w-11 shrink-0 p-0" aria-label="Farewell season help" aria-expanded={help} onClick={() => setHelp(!help)}>?</Button>
          {!plan && (help ? <Button data-farewell-review-open className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={() => setHelp(false)}>Review announcement</Button>
            : <Button data-farewell-confirm className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={announce}>{career.phase === 'retirement_suggestion' ? 'Announce and play' : 'Announce last season'}</Button>)}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
