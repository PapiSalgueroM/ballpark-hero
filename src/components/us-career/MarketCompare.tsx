import { useLayoutEffect, useRef, useState } from 'react';
import { marketOfferComparison, type MarketPriority } from '@/lib/usCareerMarket';
import type { FaWindow } from '@/lib/usCareerFreeAgency';
const modes: { id: MarketPriority; label: string }[] = [
  { id: 'annual', label: 'Annual salary' }, { id: 'total', label: 'Total value' }, { id: 'years', label: 'Years' }, { id: 'roster', label: 'Roster' },
];
export default function MarketCompare({ window: w, onBack }: { window: FaWindow; onBack: () => void }) {
  const [priority, setPriority] = useState<MarketPriority>('annual');
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  return <section data-market-compare className="space-y-3 rounded-2xl border border-border bg-card p-3">
    <h2 ref={heading} tabIndex={-1} className="text-sm font-bold">Compare your saved offers</h2>
    <p className="text-xs text-muted-foreground">Sort live offers by one priority. This view changes no offer and signs nothing. Roster quality affects the simulation, but guarantees neither a role nor a title.</p>
    <div className="grid grid-cols-2 gap-2">{modes.map(m => <button key={m.id} type="button" data-market-priority={m.id} aria-pressed={priority === m.id} onClick={() => setPriority(m.id)}
      className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold ${priority === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>{m.label}</button>)}</div>
    <ol className="space-y-2">{marketOfferComparison(w, priority).map(r => <li key={r.index} data-market-compared-offer={r.index} className="rounded-xl bg-background p-3">
      <p className="break-words text-sm font-bold">{r.offer.label}{r.offer.incumbent ? ' (your team)' : ''}</p>
      <p className="mt-1 text-xs text-muted-foreground">${r.offer.salary}M a year · ${Math.round(r.offer.salary * r.offer.years * 10) / 10}M total · {r.offer.years} years · roster {r.offer.quality}</p>
    </li>)}</ol>
    <button type="button" data-market-compare-back onClick={onBack} className="min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm font-bold">Back to offers</button>
  </section>;
}
