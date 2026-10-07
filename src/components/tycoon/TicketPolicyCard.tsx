import { TICKET_POLICIES, newTycoon, setTicketPolicy, ticketEconomy } from '@/lib/stadiumTycoon';
import type { TicketPolicy, TycoonState } from '@/lib/stadiumTycoon';

export interface TicketPolicyCardProps {
  state: TycoonState;
  onSelect: (policy: TicketPolicy) => void;
  saveFailed: boolean;
  onRetrySave: () => void;
}

const explanations: Record<TicketPolicy, string> = {
  community: '15% less gate money per fan. Supporters grow 50% faster.',
  standard: 'Regular gate money, full supporter demand and regular growth.',
  premium: '25% more gate money per fan. 75% of supporters want to attend; growth is 25% slower.',
};
const dollars = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TicketPolicyCard({ state, onSelect, saveFailed, onRetrySave }: TicketPolicyCardProps) {
  const current = ticketEconomy(state);
  const early = newTycoon(0);
  const full = { ...early, fanbase: 240 };
  const earlyStandard = ticketEconomy(early);
  const earlyPremium = ticketEconomy(setTicketPolicy(early, 'premium'));
  const fullStandard = ticketEconomy(full);
  const fullPremium = ticketEconomy(setTicketPolicy(full, 'premium'));
  const metrics = [
    ['crowd', 'Crowd / seats', current.crowd, `${current.crowd} / ${current.seats}`],
    ['gate', 'Gate / sec', current.gatePerSec, dollars(current.gatePerSec)],
    ['concessions', 'Snacks + shop / sec', current.concessionsPerSec, dollars(current.concessionsPerSec)],
    ['other', 'Parking + payroll / sec', current.otherPerSec, dollars(current.otherPerSec)],
    ['total', 'Total / sec', current.totalPerSec, dollars(current.totalPerSec)],
    ['growth', 'New supporters / sec', current.growthPerSec, current.growthPerSec.toFixed(3)],
  ] as const;
  return <section data-ticket-policy-panel data-current-policy={current.policy} data-save-status={saveFailed ? 'failed' : 'current'} className="rounded-xl border border-border bg-card p-3 mb-3 text-xs">
    <h3 className="font-bold text-sm">Ticket Office: pick your offer</h3>
    <p className="text-muted-foreground mt-1">Trade gate money for supporter growth. Choose freely; your money stays put.</p>
    {saveFailed && <div role="alert" className="mt-3 rounded-lg border border-destructive p-2">
      <p>Active now, but not saved on this device. Keep this page open and retry.</p>
      <button type="button" onClick={onRetrySave} className="min-h-[44px] min-w-[44px] font-bold underline">Retry save</button>
    </div>}
    <div className="grid grid-cols-3 gap-2 mt-3" role="group" aria-label="Ticket policy">
      {TICKET_POLICIES.map(policy => <button key={policy.id} type="button" aria-label={policy.label} aria-pressed={current.policy === policy.id} data-ticket-policy={policy.id} onClick={() => onSelect(policy.id)} className={`min-h-[44px] min-w-[44px] rounded-lg border px-1 text-xs font-bold ${current.policy === policy.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>{policy.label}</button>)}
    </div>
    <p data-ticket-policy-explanation className="mt-2">{explanations[current.policy]}</p>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 tabular-nums">
      {metrics.map(([key, label, value, shown]) => <div key={key}>
        <dt className="text-muted-foreground">{label}</dt>
        <dd data-ticket-value={key} data-value={value} className="font-bold break-words">{shown}</dd>
      </div>)}
    </dl>
    <p className="text-muted-foreground mt-2">{current.supporters} supporters. Each tap pays {dollars(current.tap)} from this income. Live boosts are included above.</p>
    {!saveFailed && <p className="text-muted-foreground mt-2">Active now. The offer applies to future earnings. Selling the ground resets it to Standard.</p>}
    <details className="mt-2">
      <summary className="min-h-[44px] flex items-center cursor-pointer font-bold">How ticket offers work</summary>
      <p>These are game rates. Crowd never exceeds your supporters or seats. Only admission prices change; snacks and the shop follow the crowd. Parking and payroll keep their own rates. Goal and win bonuses follow the actual crowd. Community grows your supporter pool faster, which can fill empty seats later.</p>
      <p className="mt-2">Example, a new 120-seat ground: {earlyStandard.supporters} supporters pay {dollars(earlyStandard.totalPerSec)}/sec on Standard. Premium draws {earlyPremium.crowd} and pays {dollars(earlyPremium.totalPerSec)}/sec. With {fullStandard.supporters} supporters, both fill {fullStandard.crowd} seats: Standard pays {dollars(fullStandard.totalPerSec)}/sec and Premium {dollars(fullPremium.totalPerSec)}/sec.</p>
      <p className="mt-2">Away income uses the saved offer at the usual reduced rate and time cap, without live boosts. Supporter growth happens while the game runs, not while away.</p>
    </details>
  </section>;
}
