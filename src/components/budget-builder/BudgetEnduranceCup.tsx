import { useEffect, useRef, useState } from 'react';
import { cupCash, cupFixtures, cupSlots, cupWeek, playCupWeek, replayBudgetCup, signCover, type BudgetCup } from '@/lib/budgetEnduranceCup';
import { FORMATIONS } from '@/lib/squadShape';

const button = 'min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-semibold disabled:opacity-50';
const primary = button + ' bg-primary text-primary-foreground';
const panel = 'space-y-2 rounded-xl border border-border bg-card p-3';

export function BudgetEnduranceCup({ cup, save, leave }: { cup: BudgetCup; save: (value: BudgetCup) => void; leave: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const [reserve, setReserve] = useState('');
  const [offerName, setOfferName] = useState('');
  const [rules, setRules] = useState(false);
  const formation = FORMATIONS.find(f => f.name === cup.formation)!;
  const slots = cupSlots(formation);
  const week = cup.played.length;
  const options = cup.offers.filter(p => !cup.bench.includes(p.name) && p.fee <= cupCash(cup)).sort((a, b) => a.fee - b.fee);
  const offer = options.find(p => p.name === offerName) ?? options[0];
  const ready = week < 3 ? cup.bench.filter(n => !!cupWeek(cup, week, n)) : [];
  const selected = ready.includes(reserve) ? reserve : null;
  const preview = week < 3 ? cupWeek(cup, week, selected) : null;
  const results = cup.played.map((name, i) => cupWeek(cup, i, name)!);
  const points = results.reduce((sum, r) => sum + (r.goals > r.against ? 3 : r.goals === r.against ? 1 : 0), 0);
  const resultTitle = week < 3 ? 'Cup receipts' : points >= 6 ? 'Cup winners' : 'Cup complete';

  function playFixture() {
    save(playCupWeek(cup, selected));
    setReserve('');
  }

  function replay() {
    save(replayBudgetCup(cup));
    setReserve('');
    setOfferName('');
  }

  return <section aria-label="Endurance Cup" className="mx-auto w-full max-w-md space-y-3 px-3 py-4">
    <header><h2 ref={heading} tabIndex={-1} className="text-2xl font-bold">Endurance Cup</h2><p className="text-sm">{cup.era} · {cup.formation} · ${cupCash(cup)}M unspent</p></header>
    <p>Face the Money XI three times. Earn six points to lift the cup. Each fixture gives one tired starter a decisive late play.</p>
    <button type="button" className={button} aria-expanded={rules} onClick={() => setRules(!rules)}>Cup rules and example</button>
    {rules && <p className={panel}>A win earns three points and a draw earns one. Sign up to two reserves before kickoff, with the money left from your starting XI. A signed reserve can cover one fixture in a position they play. For example, a fresh 72-rated defender is stronger in the late duel than an 80-rated starter carrying a 16-point fatigue penalty. Other goals come from the two starting teams' match ratings. The same XI faces the same chances on a replay.</p>}
    {cup.entryResult && <details className={panel}>
      <summary className="min-h-8 cursor-pointer font-semibold">Original XI at cup entry</summary>
      <p className="text-sm">Builder score: {cup.entryResult.score}. {cup.entryResult.legs
        ? 'Money XI final: ' + cup.entryResult.legs.map(leg => leg.join('-')).join(' · ') + '.'
        : 'The Money XI final was still to play.'}</p>
    </details>}
    {cup.previousRun && <details className={panel}>
      <summary className="min-h-8 cursor-pointer font-semibold">Previous cup with this XI</summary>
      <p className="text-sm">Scores: {cup.previousRun.legs.map(leg => leg.join('-')).join(' · ')}. Finished with ${cup.previousRun.cash}M unspent.</p>
    </details>}
    <ol aria-label="Fixture schedule" className={panel}>
      {cupFixtures.map((f, i) => <li key={f.label} className="text-sm"><strong>{i + 1}. {f.label}</strong><br />
        {formation.slots[slots[i]].label} · {cup.xi[slots[i]].name} · {f.fatigue} fatigue. {f.detail}</li>)}
    </ol>
    <section aria-label="Reserve bench" className={panel}>
      <h3 className="font-bold">Reserve bench · {cup.bench.length}/2</h3>
      {week === 0 && <p className="text-sm">Shop your market's low-cost, mid-price and top-rated cover before the first fixture. You can keep the cash and play your XI.</p>}
      {cup.bench.map(name => <div key={name} className="flex items-center justify-between gap-2 text-sm">
        <span>{name} · ${cup.offers.find(p => p.name === name)!.fee}M{cup.played.includes(name) ? ' · Used' : ''}</span>
        {week === 0 && <button type="button" className={button} onClick={() => save(signCover(cup, name))}>Release {name}</button>}
      </div>)}
      {week === 0 && cup.bench.length < 2 && (offer ? <>
        <label className="block text-sm font-semibold">Available cover
          <select className="mt-1 min-h-11 w-full rounded border bg-background p-2" value={offer.name} onChange={e => setOfferName(e.target.value)}>
            {options.map(p => <option key={p.name} value={p.name}>{p.name} · {p.position} · rating {p.rating} · ${p.fee}M</option>)}
          </select>
        </label>
        <p className="text-sm">Can cover fixture {slots.flatMap((s, i) => formation.slots[s].allowed.includes(offer.position) ? [i + 1] : []).join(' or ')}.</p>
        <button type="button" className={button} onClick={() => save(signCover(cup, offer.name))}>Sign {offer.name} for ${offer.fee}M</button>
      </> : <p className="text-sm">No more eligible cover fits your remaining budget.</p>)}
    </section>
    {preview && <section aria-label="Fixture plan" className={panel}>
      <h3 className="font-bold">Fixture {week + 1} · {cupFixtures[week].label}</h3>
      <label className="block text-sm font-semibold">Choose cover for {preview.slot.label}
        <select className="mt-1 min-h-11 w-full rounded border bg-background p-2" value={selected ?? ''} onChange={e => setReserve(e.target.value)}>
          <option value="">Keep {preview.tired.name} on</option>{ready.map(n => <option key={n} value={n}>Deploy {n}</option>)}
        </select>
      </label>
      <p className="text-sm">{preview.cover.name} plays the late duel at {preview.rating} against {preview.opponent.name} ({preview.opponent.rating}). Chance to win it: {preview.chance}%.</p>
      <button type="button" className={primary} onClick={playFixture}>Play fixture {week + 1}</button>
    </section>}
    {!!results.length && <section aria-label="Cup receipts" aria-live="polite" className={panel}>
      <h3 className="font-bold">{resultTitle} · {points} {points === 1 ? 'point' : 'points'}</h3>
      {results.map((r, i) => <p className="text-sm" key={i}><strong>Fixture {i + 1}: {r.goals}-{r.against}</strong> · {r.cover.name} {cup.played[i] ? 'came off the bench' : 'stayed on'} and {r.won ? 'won' : 'lost'} the late duel ({r.chance}%).</p>)}
      {week === 3 && <button type="button" className={button} onClick={replay}>Replay with a fresh bench</button>}
    </section>}
    <button type="button" className={button} onClick={leave}>Back to Budget Builder</button>
  </section>;
}
