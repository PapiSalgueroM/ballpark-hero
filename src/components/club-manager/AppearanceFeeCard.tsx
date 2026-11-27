import { useState } from 'react';
import { appearanceFeeClubs, appearanceFeeDesk, appearanceFeeTerms, canBookAppearanceFee, moneyIn, type CareerState } from '@/lib/clubManager';
import { currencySymbol } from '@/lib/clubManagerStart';
import { formatNumber } from '@/lib/formatNumber';
import { MadeUpTag } from './SquadScreen';

export function AppearanceFeeOffer({ career, amount, threshold, cash, offerLabel, onChange }: {
  career: CareerState;
  amount: number;
  threshold?: 5 | 15;
  cash: number;
  offerLabel: string;
  onChange: (threshold?: 5 | 15) => void;
}) {
  const fmt = moneyIn(career), terms = appearanceFeeTerms(amount, threshold);
  const available = canBookAppearanceFee(career);
  return <div className="space-y-2 border-t border-border pt-2 text-xs">
    <label className="block font-semibold">When the add-on is paid
      <select className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-2"
        value={threshold ?? 'summer'} onChange={e => onChange(e.target.value === '5' ? 5 : e.target.value === '15' ? 15 : undefined)}>
        <option value="summer">Summer performance review</option>
        <option value="5" disabled={!available}>After 5 league appearances</option>
        <option value="15" disabled={!available}>After 15 league appearances</option>
      </select>
    </label>
    {terms ? <>
      <p>The seller counts <strong>{fmt(terms.sellerValue)}</strong> toward your offer. The full {fmt(terms.amount)} becomes due after {terms.threshold} league appearances for {career.clubName}.</p>
      <p>{offerLabel} offers <strong>{fmt(cash)}</strong> at signing. With the appearance fee, the clubs could exchange <strong>{fmt(cash + terms.amount)}</strong> in cash.</p>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">Appearance fee rules and example</summary>
        <p>{terms.threshold - 1} league starts and one substitute appearance would trigger this fee. Loans pause the count. A permanent departure before the target closes the clause. Track payments and any balance in Finances.</p>
      </details>
    </> : <p>The performance bonus is reviewed in summer.</p>}
    {!available && <p>This save has an agreement this version cannot read. Choose the summer review to keep negotiating.</p>}
  </div>;
}

const statusText = { tracking: 'Still conditional', due: 'Payment due', paid: 'Paid in full', void: 'Closed before the target' };

export function AppearanceFeeLedger({ career }: { career: CareerState }) {
  const [selected, setSelected] = useState('');
  const current = appearanceFeeDesk(career);
  const previous = appearanceFeeClubs(career).filter(club => club !== career.clubName).flatMap(club => appearanceFeeDesk(career, club));
  const rows = [...current, ...previous];
  const fee = rows.find(row => row.id === selected) ?? rows[0];
  if (!fee) return null;
  const fmt = (amount: number) => `${currencySymbol(career)}${formatNumber(Math.round(amount * 1_000_000))}`;
  const due = current.filter(row => row.status === 'due').reduce((sum, row) => sum + row.amount - row.paid, 0);
  const possible = current.filter(row => row.status === 'tracking').reduce((sum, row) => sum + row.amount, 0);
  const paidThisSeason = current.flatMap(row => row.payments).filter(p => p.season === career.season).reduce((sum, p) => sum + p.amount, 0);
  return <details className="rounded-xl border border-border bg-card px-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">Transfer fee commitments</summary>
    <section aria-label="Transfer fee commitments" className="space-y-2 pb-3 text-xs">
      <p><strong>{career.clubName}</strong> paid {fmt(paidThisSeason)} in appearance fees this season. {fmt(due)} is due now. A further {fmt(possible)} depends on future appearances.</p>
      <label className="block font-semibold">Transfer agreement
        <select className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2"
          value={fee.id} onChange={e => setSelected(e.target.value)}>
          {rows.map(row => <option key={row.id} value={row.id}>{row.player}{row.generated ? ' (generated)' : ''} · {row.buyer} · {row.threshold} games</option>)}
        </select>
      </label>
      <div aria-live="polite" className="space-y-1 rounded-md bg-secondary/40 p-2">
        <p className="font-bold">{fee.player}{fee.generated && <MadeUpTag className="ml-1" />} · {statusText[fee.status]}</p>
        <p>{fee.buyer} agreed to pay {fee.seller} {fmt(fee.amount)} at {fee.threshold} league appearances. Signed in season {fee.signed.season}, week {fee.signed.week + 1}.</p>
        <p>{fee.appearances} of {fee.threshold} league appearances · {fmt(fee.paid)} paid</p>
        {fee.status === 'due' && <p className="font-semibold">{fmt(fee.amount - fee.paid)} remains due from {fee.buyer}. The club pays from funds above its {fmt(5)} reserve after matches and when the next season opens.</p>}
        {fee.triggered && <p>Earned in season {fee.triggered.season}, week {fee.triggered.week + 1}.</p>}
        {fee.status === 'void' && fee.closed && <p>Closed in season {fee.closed.season}, week {fee.closed.week + 1}.</p>}
        {fee.payments.length > 0 && <details>
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Payment history</summary>
          <ul className="space-y-1">{fee.payments.map((p, i) => <li key={i}>Season {p.season}, week {p.week + 1} · {fmt(p.amount)} paid to {fee.seller}</li>)}</ul>
        </details>}
      </div>
    </section>
  </details>;
}
