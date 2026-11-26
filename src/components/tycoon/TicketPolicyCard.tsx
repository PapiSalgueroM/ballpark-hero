import { useId } from 'react';
import { TICKET_POLICIES, newTycoon, setTicketPolicy, ticketEconomy } from '@/lib/stadiumTycoon';
import type { TicketPolicy, TycoonState } from '@/lib/stadiumTycoon';
import { formatNumber } from '@/lib/formatNumber';

export interface TicketPolicyCardProps {
  state: TycoonState;
  onSelect: (policy: TicketPolicy) => void;
  saveFailed: boolean;
  onRetrySave: () => void;
  showSaveNotice?: boolean;
}

const explanations: Record<TicketPolicy, string> = {
  community: '15% less gate money per fan. Supporters grow 50% faster.',
  standard: 'Regular gate money, full supporter demand and regular growth.',
  premium: '25% more gate money per fan. 75% of supporters want to attend; growth is 25% slower.',
};
const dollars = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TicketPolicyCard({ state, onSelect, saveFailed, onRetrySave, showSaveNotice = true }: TicketPolicyCardProps) {
  const quotesId = useId();
  const current = ticketEconomy(state);
  const recent = [state.lastCompletedLeague, state.league].flatMap(league =>
    league?.results?.flatMap(match => match.ticketOffer && match.attendance !== undefined
      ? [{ season: league.season + 1, day: match.day, offer: match.ticketOffer, fans: match.attendance }]
      : []) ?? []).slice(-3).reverse();
  const early = newTycoon(0);
  const full = { ...early, fanbase: 240 };
  const earlyStandard = ticketEconomy(early);
  const earlyPremium = ticketEconomy(setTicketPolicy(early, 'premium'));
  const fullStandard = ticketEconomy(full);
  const fullPremium = ticketEconomy(setTicketPolicy(full, 'premium'));
  const metrics = [
    ['crowd', 'Crowd / seats', current.crowd, `${formatNumber(current.crowd)} / ${formatNumber(current.seats)}`],
    ['gate', 'Gate / sec', current.gatePerSec, dollars(current.gatePerSec)],
    ['concessions', 'Snacks + shop / sec', current.concessionsPerSec, dollars(current.concessionsPerSec)],
    ['other', 'Parking + payroll / sec', current.otherPerSec, dollars(current.otherPerSec)],
    ['total', 'Total / sec', current.totalPerSec, dollars(current.totalPerSec)],
    ['growth', 'New supporters / sec', current.growthPerSec, current.growthPerSec.toFixed(3)],
  ] as const;
  return <section data-ticket-policy-panel data-current-policy={current.policy} data-save-status={saveFailed ? 'failed' : 'current'} className="rounded-xl border border-border bg-card p-3 mb-3 text-xs">
    <h3 className="font-bold text-sm">Ticket offer: pick your price</h3>
    <p className="text-muted-foreground mt-1">Trade gate money for supporter growth. Compare the crowd and total income per second at your ground. Switching is free.</p>
    {saveFailed && showSaveNotice && <div role="alert" className="mt-3 rounded-lg border border-destructive p-2">
      <p>Active now, but not saved on this device. Keep this page open and retry.</p>
      <button type="button" onClick={onRetrySave} className="min-h-[44px] min-w-[44px] font-bold underline">Retry save</button>
    </div>}
    <div className="grid grid-cols-3 gap-2 mt-3" role="group" aria-label="Ticket policy">
      {TICKET_POLICIES.map(policy => {
        const active = current.policy === policy.id;
        const quote = active ? current : ticketEconomy(setTicketPolicy(state, policy.id));
        const quoteId = `${quotesId}-${policy.id}`;
        return <button key={policy.id} type="button" aria-label={policy.label} aria-describedby={quoteId} aria-pressed={active} data-ticket-policy={policy.id} onClick={() => onSelect(policy.id)} className={`min-h-[44px] min-w-[44px] rounded-lg border px-1 py-2 text-xs font-bold ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>
          {policy.label}
          <span id={quoteId} className="mt-1 block break-words text-[11px] font-medium tabular-nums">
            <span className="block">{formatNumber(quote.crowd)} {quote.crowd === 1 ? 'fan' : 'fans'}</span>{' '}
            <span className="block">{dollars(quote.totalPerSec)}/sec</span>
          </span>
        </button>;
      })}
    </div>
    <p data-ticket-policy-explanation className="mt-2">{explanations[current.policy]}</p>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 tabular-nums">
      {metrics.map(([key, label, value, shown]) => <div key={key}>
        <dt className="text-muted-foreground">{label}</dt>
        <dd data-ticket-value={key} data-value={value} className="font-bold break-words">{shown}</dd>
      </div>)}
    </dl>
    <p className="text-muted-foreground mt-2">{formatNumber(current.supporters)} supporters. Each tap pays {dollars(current.tap)} from this income. Live boosts are included above.</p>
    {!saveFailed && <p className="text-muted-foreground mt-2">Active now. The offer applies to future earnings. Selling the ground resets it to Standard.</p>}
    {recent.length > 0 && <details className="mt-2">
      <summary className="min-h-11 flex items-center cursor-pointer font-bold">Recent ticket offers at full time</summary>
      <ol className="divide-y divide-border">
        {recent.map(({ season, day, offer, fans }) => <li key={season + '/' + day} className="flex flex-wrap justify-between gap-x-2 py-2">
          <span>Season {season}, match {day} · {TICKET_POLICIES.find(p => p.id === offer.policy)?.label}</span>
          <span className="tabular-nums">{formatNumber(fans)} / {formatNumber(offer.seats)} seats filled</span>
        </li>)}
      </ol>
    </details>}
    <details className="mt-2">
      <summary className="min-h-[44px] flex items-center cursor-pointer font-bold">How ticket offers work</summary>
      <p>These are game rates. Crowd never exceeds your supporters or seats. Only admission prices change; snacks and the shop follow the crowd. Parking and payroll keep their own rates. Goal and win bonuses pay seconds of your income before live boosts, so they follow what the offer earns. Community grows your supporter pool faster, which can fill empty seats later.</p>
      <p className="mt-2">Example, a new 120-seat ground: {earlyStandard.supporters} supporters pay {dollars(earlyStandard.totalPerSec)}/sec on Standard. Premium draws {earlyPremium.crowd} and pays {dollars(earlyPremium.totalPerSec)}/sec. With {fullStandard.supporters} supporters, both fill {fullStandard.crowd} seats: Standard pays {dollars(fullStandard.totalPerSec)}/sec and Premium {dollars(fullPremium.totalPerSec)}/sec.</p>
      <p className="mt-2">Away income uses the saved offer at the usual reduced rate and time cap, without live boosts. Supporter growth happens while the game runs, not while away.</p>
    </details>
  </section>;
}
