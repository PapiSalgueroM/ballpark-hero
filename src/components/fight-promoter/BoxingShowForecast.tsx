import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Props = {
  attendance: number;
  capacity: number;
  gate: number;
  guaranteedPurses: number;
  rent: number;
  money: number;
};

const cash = (value: number) => `${value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}m`;

export default function BoxingShowForecast({ attendance, capacity, gate, guaranteedPurses, rent, money }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const helpHeading = useRef<HTMLHeadingElement>(null);
  const guarantees = Math.round(guaranteedPurses * 1000) / 1000;
  const share = Math.round(gate * 0.58 * 1000) / 1000;
  const purses = Math.max(guarantees, share);
  const profit = Math.round((gate - purses - rent) * 1000) / 1000;
  const cashAfter = Math.round((money + profit) * 1000) / 1000;
  const result = `${profit < 0 ? 'Loss' : 'Profit'} ${cash(Math.abs(profit))}`;

  return (
    <section data-boxing-forecast aria-label="Show cash forecast" className="mt-2 border-t pt-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Show cash forecast</h3>
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogTrigger asChild>
            <button ref={helpTrigger} type="button" aria-label="Show cash rules" className="h-11 w-11 shrink-0 rounded-md border text-sm font-semibold">?</button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-md overflow-y-auto rounded-xl p-4 [&>button:last-child]:h-11 [&>button:last-child]:w-11"
            onOpenAutoFocus={event => { event.preventDefault(); helpHeading.current?.focus({ preventScroll: true }); }}
            onCloseAutoFocus={event => { event.preventDefault(); helpTrigger.current?.focus({ preventScroll: true }); }}>
            <DialogTitle ref={helpHeading} tabIndex={-1} className="pr-12 text-base">How show cash works</DialogTitle>
            <DialogDescription className="text-xs">Check the current card before you put the show on. All money figures are in millions.</DialogDescription>
            <div className="space-y-3 text-xs leading-relaxed">
              <p>Your card, venue and ticket price set attendance and the gate. Fighters take the larger of their combined guarantees or 58% of the gate. Room hire is paid as well.</p>
              <p data-boxing-cash-example className="rounded-md border bg-muted/40 p-3">For this card: {cash(gate)} gate, less {cash(purses)} fighter pay and {cash(rent)} room hire, gives a {result.toLowerCase()}. Your cash goes from {cash(money)} to {cash(cashAfter)}.</p>
              <p>A cash balance below 0 ends the promotion. Exactly 0 keeps it open, with no cash buffer. A loss does not end it if you can still cover it.</p>
              <p>These figures follow your current choices. Fight results and reputation are decided when the show runs. Opening or closing this help does not run a show.</p>
            </div>
            <button type="button" onClick={() => setHelpOpen(false)} className="min-h-11 rounded-md border px-3 py-2 text-xs font-semibold">Back to card</button>
          </DialogContent>
        </Dialog>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 tabular-nums">
        <div><dt className="text-muted-foreground">Attendance</dt><dd data-boxing-attendance data-value={attendance} className="font-semibold">{attendance.toLocaleString('en-US')} of {capacity.toLocaleString('en-US')}</dd></div>
        <div><dt className="text-muted-foreground">Gate</dt><dd data-boxing-gate data-value={gate} className="font-semibold">{cash(gate)}</dd></div>
        <div><dt className="text-muted-foreground">Fighter pay</dt><dd data-boxing-purses data-value={purses} className="font-semibold">{cash(purses)}</dd></div>
        <div><dt className="text-muted-foreground">Room hire</dt><dd data-boxing-rent data-value={rent} className="font-semibold">{cash(rent)}</dd></div>
        <div><dt className="text-muted-foreground">Show result</dt><dd data-boxing-profit data-value={profit} className={`font-semibold ${profit < 0 ? 'text-destructive' : ''}`}>{result}</dd></div>
        <div><dt className="text-muted-foreground">Cash afterward</dt><dd data-boxing-cash-after data-value={cashAfter} className={`font-semibold ${cashAfter < 0 ? 'text-destructive' : ''}`}>{cash(cashAfter)}</dd></div>
      </dl>
      <p className="mt-2 text-muted-foreground">Fighter pay is the larger of <span data-boxing-guarantees data-value={guarantees}>{cash(guarantees)}</span> in guarantees or <span data-boxing-share data-value={share}>{cash(share)}</span> from 58% of the gate.</p>
      {cashAfter < 0 && <p role="status" className="mt-2 font-semibold text-destructive">This show would leave you below 0 and end the promotion.</p>}
      {cashAfter === 0 && <p role="status" className="mt-2 font-semibold">This leaves exactly 0. Your promotion stays open, with no cash buffer.</p>}
    </section>
  );
}
