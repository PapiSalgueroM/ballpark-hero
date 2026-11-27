import { useEffect, useRef, useState } from 'react';
import { campaigns, earnedContracts, forecast, openingGround, openingShift, playSeason, projects, readDirectorSeason, ticketPrices, winningScore, type Campaign, type Season, type Shift } from '@/lib/matchdayDirector';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';

const saveKey = 'dukb-matchday-director-v1';
const button = 'min-h-11 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:border-primary focus-visible:outline-primary';
const field = 'mt-1 block min-h-11 w-full rounded-lg border border-border bg-background p-2 text-sm';
const dollars = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export default function MatchdayDirector() {
  const [initial] = useState(() => safeLocalStorage.getItem(saveKey));
  const stored = useRef(initial);
  const [season, setSeason] = useState(() => readDirectorSeason(stored.current));
  const [shift, setShift] = useState<Shift>(openingShift);
  const [notice, setNotice] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== null && event.key !== saveKey) return;
      const raw = safeLocalStorage.getItem(saveKey);
      if (raw === stored.current) return;
      stored.current = raw;
      setSeason(readDirectorSeason(raw));
      setShift(openingShift);
      setShowReceipt(false);
      setNotice('Loaded the latest shift from this browser.');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const commit = (next: Season) => {
    const raw = safeLocalStorage.getItem(saveKey);
    if (raw !== stored.current) {
      stored.current = raw;
      setSeason(readDirectorSeason(raw));
      setShowReceipt(false);
      setNotice('Another tab played this fixture. Check the updated books.');
    } else {
      const cabinet = earnedContracts(next);
      const settled = cabinet ? { ...next, cabinet } : next;
      const bytes = JSON.stringify(settled);
      const saved = safeSetItem(saveKey, bytes);
      if (saved) stored.current = bytes;
      setSeason(settled);
      setShowReceipt(next.shifts.length > 0);
      setNotice(saved ? '' : 'Your shift is in this tab. Browser storage is unavailable.');
    }
    setShift(openingShift);
  };
  const rows = season ? playSeason(season) : [];
  const week = rows.length;
  const last = rows[week - 1];
  const ground = last?.next ?? openingGround;
  const campaign = season && campaigns[season.campaign];
  const finished = !!campaign && week === campaign.crowds.length;
  const quote = season && !finished ? forecast(season.campaign, week, ground, shift) : null;
  const cabinet = season && earnedContracts(season);

  return <section aria-labelledby="director-title" className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-2">
      <div><h2 id="director-title" className="font-display text-2xl font-bold">Matchday Director</h2>
        {campaign && <p className="text-sm text-muted-foreground">{campaign.name} · {finished ? 'Final accounts' : `Fixture ${week + 1} of 6`}</p>}</div>
      {season && <button type="button" className={button} aria-expanded={showRules} aria-label="Matchday Director rules" onClick={() => setShowRules(!showRules)}>?</button>}
    </div>
    {(!season || showRules) && <div className="my-3 space-y-1 text-sm">
      <p>Run the gates and food counters for six home fixtures. Pick a ticket price, put four crew on duty and decide when to build. Each new turnstile adds 26 admissions per fixture. Each new counter can serve 21 more meals.</p>
      <p>Two on gates and two on food can admit 66 fans and serve 34 meals on opening day. Turning fans away reduces the next crowd. Community prices bring in 18 extra fans and build your following. Premium prices draw 22 fewer. Meals sell for $3. Your lease and crew cost $200 per fixture.</p>
    </div>}
    {notice && <p role="status" className="my-2 text-sm">{notice}</p>}
    {campaign && <div className="my-3 grid grid-cols-2 gap-2 rounded-lg bg-background p-3 text-sm">
      <p>Admissions <strong className="block text-lg tabular-nums">{ground.admitted} / {campaign.target}</strong></p>
      <p>Cash <strong className="block text-lg tabular-nums">{dollars(ground.cash)} / {dollars(campaign.reserve)}</strong></p>
    </div>}
    {finished && campaign && <p role="status" className="my-2 font-bold">{ground.cash >= campaign.reserve && ground.admitted >= campaign.target
      ? 'Both targets met. Your ground wins the contract!' : 'Season complete. The contract needs both targets.'}</p>}
    {cabinet && <details className="my-2 rounded-lg border p-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold">Signed contracts</summary>
      {cabinet.community && <p>Community attendance record <strong>{winningScore('community', cabinet.community)} fans</strong></p>}
      {cabinet.cup && <p>Cup cash record <strong>{dollars(winningScore('cup', cabinet.cup)!)}</strong></p>}
    </details>}
    {(!season || finished) && <div className="grid gap-2 sm:grid-cols-2">{(Object.keys(campaigns) as Campaign[]).map(id =>
      <button type="button" key={id} className={button + ' text-left'} onClick={() => commit({ campaign: id, shifts: [], ...(cabinet ? { cabinet } : {}) })}>
        <strong className="block">Start {campaigns[id].name}</strong>
        <span className="text-xs font-normal">{campaigns[id].target} admissions · finish with {dollars(campaigns[id].reserve)}</span>
      </button>)}</div>}
    {showReceipt && last && !finished && <div className="space-y-2 rounded-lg border border-primary/40 bg-background p-3 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <h3 className="font-display text-lg font-bold">{last.fixture.name} receipt</h3>
      <p>{last.admitted} fans got in, {last.turnedAway} turned away. You sold {last.meals} meals.</p>
      <p>{dollars(last.receipts)} in sales · {dollars(last.cost + last.operatingCost)} in costs</p>
      <button type="button" className={button} onClick={() => setShowReceipt(false)}>Plan fixture {week + 1}</button>
    </div>}
    {season && quote && !showReceipt && <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (quote.cost <= Math.max(0, ground.cash)) commit({ ...season, shifts: [...season.shifts, shift] });
    }}>
      <div className="rounded-lg border-l-4 border-primary bg-background p-3">
        <h3 className="font-display text-lg font-bold">{quote.fixture.name}</h3>
        <p className="text-sm">{campaign!.crowds[week] + ground.following} fans expected at standard prices. Each gate worker admits {quote.fixture.gateRate} fans. {quote.fixture.mealRate}% of arrivals want food.</p>
        <p className="mt-1 text-xs text-muted-foreground">Extra turnstiles {ground.gates} · Extra food counters {ground.kiosks}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-bold">Tickets<select className={field} value={shift.price} onChange={e => setShift({ ...shift, price: e.target.value as Shift['price'] })}>
          {Object.entries(ticketPrices).map(([key, price]) => <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)} · {dollars(price)}</option>)}</select></label>
        <label className="text-xs font-bold">Crew assignment<select className={field} value={shift.gates} onChange={e => setShift({ ...shift, gates: Number(e.target.value) })}>
          {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n} gates · {4 - n} food</option>)}</select></label>
        <label className="text-xs font-bold">Ground investment<select className={field} value={shift.project} onChange={e => setShift({ ...shift, project: e.target.value as Shift['project'] })}>
          {Object.entries(projects).map(([key, project]) => <option key={key} value={key} disabled={project.cost > Math.max(0, ground.cash)}>{project.label}{project.cost ? ' · ' + dollars(project.cost) : ''}</option>)}</select></label>
      </div>
      <div aria-label="Fixture forecast" className="grid gap-1 rounded-lg bg-background p-3 text-sm">
        <strong>Fixture forecast</strong>
        <p>{quote.admitted} of {quote.crowd} fans get in · {quote.meals} meals sold</p>
        <progress aria-label="Share of expected fans admitted" className="h-2 w-full accent-primary" max={Math.max(1, quote.crowd)} value={quote.admitted} />
        <p>{dollars(quote.receipts)} sales · {dollars(quote.operatingCost + quote.cost)} costs</p>
        <p>Cash after the fixture <strong>{dollars(quote.next.cash)}</strong></p>
      </div>
      <button className="min-h-11 w-full rounded-lg bg-primary px-4 font-bold text-primary-foreground" type="submit">Play fixture {week + 1}</button>
    </form>}
    {rows.length > 0 && <details className="mt-3 border-t border-border text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold">Matchday receipts ({week})</summary>
      <ol className="space-y-2">{rows.map((r, i) => <li key={i} className="rounded-lg bg-background p-2">
        <strong>Fixture {i + 1}</strong> · {r.admitted} admitted · {r.turnedAway} turned away · {r.meals} meals<br />
        {dollars(r.receipts)} in · {dollars(r.cost + r.operatingCost)} out · closing cash {dollars(r.next.cash)}
      </li>)}</ol>
    </details>}
  </section>;
}
