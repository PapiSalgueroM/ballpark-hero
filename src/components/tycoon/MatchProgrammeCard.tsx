import { attendance, programmeFixture, type ProgrammeQuote, type TycoonState } from '@/lib/stadiumTycoon';
import { formatNumber } from '@/lib/formatNumber';

interface Props {
  state: TycoonState;
  onOrder: (ground: number, match: number, quote: ProgrammeQuote) => void;
  saveFailed: boolean;
}

export default function MatchProgrammeCard({ state, onOrder, saveFailed }: Props) {
  const fixture = programmeFixture(state);
  if (!fixture) return null;
  const order = state.programmeOrder;
  return <details className="mb-3 rounded-xl border border-border bg-card px-3 text-xs">
    <summary className="min-h-11 cursor-pointer py-3 font-bold">{order ? 'Programme order booked' : 'Match programmes'}</summary>
    <p className="font-bold">Matchday {fixture.day} vs {fixture.opponent}</p>
    {order ? <p className="py-2">{formatNumber(order.copies)} printed · ${formatNumber(order.cost)} paid · ${formatNumber(order.price)} per sale</p> : <>
      <p className="py-2 text-muted-foreground">Print for one fixture. One in four fans buys a copy at full time, up to your stock. Unsold copies expire.</p>
      <p className="pb-2">At today's crowd of {formatNumber(attendance(state))}, expect {formatNumber(Math.floor(attendance(state) / 4))} buyers. Sale price ${formatNumber(fixture.short.price)}.</p>
      {saveFailed && <p role="alert" className="pb-2 text-destructive">Could not save the print order. Try again.</p>}
      <div className="grid gap-2 pb-3 sm:grid-cols-2">
        {[fixture.short, fixture.bulk].map(quote => <button key={quote.run} type="button" disabled={state.money < quote.cost}
          onClick={() => onOrder(state.rep, fixture.match, quote)}
          className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-left disabled:opacity-60">
          <span className="block font-bold">{quote.run === 'short' ? 'Short' : 'Bulk'} run · Print {formatNumber(quote.copies)} for ${formatNumber(quote.cost)}</span>
          Sell {formatNumber(Math.ceil(quote.cost / quote.price))} to break even
        </button>)}
      </div>
    </>}
  </details>;
}
