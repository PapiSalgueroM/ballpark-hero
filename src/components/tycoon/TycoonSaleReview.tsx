import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  canPrestige, DIVISIONS, fmtMoney, legacyPointsOf, newTycoon, pointsForSale,
  repMult, startingMoneyOf, TICKET_POLICIES,
} from '@/lib/stadiumTycoon';
import type { TycoonState } from '@/lib/stadiumTycoon';
import { formatNumber } from '@/lib/formatNumber';

/* Release AM: the page groups its money since Round 1085 ($2,540), and the
   engine's own fmtMoney does not under 10,000 ($2540), so the review said one
   and the new ground's header said the other a second later. Same grouping
   here as the page's own wrapper. */
const money = (n: number) => fmtMoney(n).replace(/^\$(-?\d+(?:\.\d+)?)([KMBTQ]?)$/, (_text,amount: string, unit: string) => `$${formatNumber(amount)}${unit}`);

export default function TycoonSaleReview({ state, onSell }: {
  state: TycoonState; onSell: () => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const selling = useRef(false);
  const fresh = useMemo(() => newTycoon(0), []);
  const award = pointsForSale(state);
  const startingCash = startingMoneyOf(state);
  const currentRep = repMult(state);
  const nextRep = repMult({ ...state, rep: state.rep + 1 });
  const currentPoints = legacyPointsOf(state);
  const changeOpen = (next: boolean) => {
    if (next) { selling.current = false; setHelp(false); setSaveFailed(false); }
    setOpen(next);
  };
  const sell = () => {
    if (selling.current || !canPrestige(state)) return;
    selling.current = true;
    if (onSell()) setOpen(false);
    else { setSaveFailed(true); selling.current = false; }
  };
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button ref={trigger} data-sell-up aria-label="Review selling up" className="min-h-11 h-auto w-full whitespace-normal rounded-xl bg-yellow-500 py-2.5 text-sm font-bold text-black hover:bg-yellow-400 st-glow">
          ⭐ Sell up: +1 star, +{award} legacy point{award === 1 ? '' : 's'}
        </Button>
      </DialogTrigger>
      <DialogContent data-tycoon-sale-review className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-md flex-col gap-3 rounded-xl p-4 [&>button:last-child]:h-11 [&>button:last-child]:w-11"
        onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogTitle ref={heading} tabIndex={-1} className="pr-12 text-base">Sell up review</DialogTitle>
        <DialogDescription className="text-xs">Restart this ground with permanent rewards. The match keeps running while you decide.</DialogDescription>
        <div className="min-h-0 space-y-3 overflow-y-auto text-xs leading-relaxed">
          {help ? <div data-sale-help className="space-y-3">
            <p>Selling up trades this ground's progress for one reputation star and legacy points. Your reputation multiplier is permanent, but today's income also depends on the ground, crowd and staff you are resetting.</p>
            <p>Example: selling now adds {award} legacy point{award === 1 ? '' : 's'}, taking your balance from {currentPoints} to {currentPoints + award}. Your new ground opens with {money(startingCash)}. Rolling Investment is already included.</p>
            <p>These terms follow the live game. A promotion while this is open can increase the legacy points. Back leaves the sale untouched. Only Sell and restart sells the ground.</p>
          </div> : <>
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <div><dt className="text-muted-foreground">Legacy points earned</dt><dd data-sale-award={award} className="font-bold text-sm">+{award}</dd></div>
              <div><dt className="text-muted-foreground">New ground cash</dt><dd data-sale-starting-cash={startingCash} className="font-bold text-sm">{money(startingCash)}</dd></div>
              <div className="col-span-2"><dt className="text-muted-foreground">Reputation multiplier</dt><dd className="font-bold text-sm"><span data-sale-rep-current={currentRep}>x{currentRep.toFixed(2)}</span> to <span data-sale-rep-next={nextRep}>x{nextRep.toFixed(2)}</span></dd></div>
            </dl>
            <div data-sale-resets className="space-y-1 rounded-lg bg-muted/40 p-3">
              <p className="font-semibold">This ground resets</p>
              <p>Current cash becomes {money(startingCash)}. This ground's earnings reset to 0. Fans return to {fresh.fanbase}. Ground upgrades and staff start at level 0.</p>
              <p>You restart in {DIVISIONS[0].name}. The current match, table, win streak and temporary boosts reset.</p>
              <p>Ticket offer returns to {TICKET_POLICIES.find(policy => policy.id === 'standard')!.label}.</p>
            </div>
            <div data-sale-keeps className="space-y-1">
              <p className="font-semibold">You keep</p>
              <p>Your club name, reputation, legacy points and perks, badges, league titles and career records.</p>
              <p>Your Academy players, first team, gems and gear stay as they are.</p>
            </div>
          </>}
        </div>
        {saveFailed && <p role="alert" data-sale-save-error className="shrink-0 rounded-lg border border-destructive p-2 text-xs">The sale could not be saved. Your ground is still running. Keep this page open and try Sell and restart again.</p>}
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className={`h-11 px-3 text-xs ${help ? 'flex-1' : 'w-16 shrink-0'}`} onClick={() => help ? setHelp(false) : changeOpen(false)}>{help ? 'Back to sale review' : 'Back'}</Button>
          <Button variant="outline" className="h-11 w-11 shrink-0 p-0" aria-label={help ? 'Close sell up help' : 'Sell up help'} aria-expanded={help} onClick={() => setHelp(value => !value)}>?</Button>
          {!help && <Button className="h-11 min-w-0 flex-1 px-2 text-xs" disabled={!canPrestige(state)} onClick={sell}>Sell and restart</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
